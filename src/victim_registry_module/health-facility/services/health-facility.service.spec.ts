import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HealthFacilityEntity } from '../entities/health-facility.entity';
import {
  HealthFacilityService,
  cleanFacilityName,
  normalizeFacilityName,
} from './health-facility.service';

describe('HealthFacilityService', () => {
  let service: HealthFacilityService;
  let repo: any;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'hf-1', name: 'Hospital del Niño', normalizedName: 'hospital del nino' }]),
    };
    repo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: any) => data),
      save: jest.fn(async (data: any) => ({ id: 'hf-new', ...data })),
    };
    const module = await Test.createTestingModule({
      providers: [HealthFacilityService, { provide: getRepositoryToken(HealthFacilityEntity), useValue: repo }],
    }).compile();
    service = module.get(HealthFacilityService);
  });

  it('normaliza sin tildes, mayúsculas ni espacios de más', () => {
    expect(cleanFacilityName('  Hospital   del Niño ')).toBe('Hospital del Niño');
    expect(normalizeFacilityName('  HOSPITAL   del Niño ')).toBe('hospital del nino');
  });

  it('busca por la clave normalizada y devuelve solo id y nombre', async () => {
    await expect(service.search('NIÑO')).resolves.toEqual([{ id: 'hf-1', name: 'Hospital del Niño' }]);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('facility.normalized_name LIKE :term', { term: '%nino%' });
  });

  it('reutiliza un centro existente aunque se escriba distinto', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'hf-1', name: 'Hospital del Niño' });
    await expect(service.findOrCreate('hospital del nino')).resolves.toEqual({ id: 'hf-1', name: 'Hospital del Niño' });
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('crea el centro con el nombre limpio si no existe', async () => {
    const created = await service.findOrCreate('  Clínica   Copacabana ');
    expect(created).toEqual({ id: 'hf-new', name: 'Clínica Copacabana', normalizedName: 'clinica copacabana' });
  });

  it('si otro registro lo creó en paralelo, reutiliza ese', async () => {
    repo.save.mockRejectedValueOnce(new Error('duplicate key'));
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'hf-2', name: 'Clínica Copacabana' });
    await expect(service.findOrCreate('Clínica Copacabana')).resolves.toEqual({ id: 'hf-2', name: 'Clínica Copacabana' });
  });

  it('rechaza nombres vacíos o demasiado largos', async () => {
    await expect(service.findOrCreate('   ')).rejects.toThrow(BadRequestException);
    await expect(service.findOrCreate('x'.repeat(151))).rejects.toThrow(BadRequestException);
  });
});
