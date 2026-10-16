import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ChargeService } from './charge.service';
import { ChargeEntity } from '../entities/charges.entity';

describe('ChargeService', () => {
  let service: ChargeService;
  let mockRepo: any;
  let qb: any;
  let attendRepo: { count: jest.Mock };

  beforeEach(async () => {
    qb = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) };
    attendRepo = { count: jest.fn().mockResolvedValue(0) };
    mockRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'charge-1', name: 'comandante' }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (data: any) => ({ id: 'charge-1', ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => qb),
      manager: { getRepository: () => attendRepo },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChargeService,
        { provide: getRepositoryToken(ChargeEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ChargeService>(ChargeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('delete - soft delete (F1-012)', () => {
    it('marca is_deleted = true en vez de borrar físicamente', async () => {
      const result = await service.delete('charge-1');

      expect(mockRepo.update).toHaveBeenCalledWith('charge-1', {
        isDeleted: true,
      });
      expect(mockRepo.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('lanza BadRequestException si el update no afecta filas', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'charge-1' });
      mockRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.delete('charge-1')).rejects.toThrow(
        'Charge not deleted.',
      );
    });
  });

  describe('queries - excluyen registros soft-deleted (F1-012)', () => {
    it('findOne filtra por isDeleted: false', async () => {
      await service.findOne('charge-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'charge-1', isDeleted: false },
      });
    });

    it('findByName filtra por isDeleted: false', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'charge-1' }),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const res = await service.findByName('comandante');

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('charge');
      expect(mockQb.andWhere).toHaveBeenCalledWith('charge.isDeleted = false');
      expect(res).toEqual({ id: 'charge-1' });
    });

    it('findAll filtra por isDeleted: false', async () => {
      await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { isDeleted: false },
      }));
    });
  });

  describe('create - system_name (F1-013)', () => {
    it('persiste el system_name de un cargo propio', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'charge-1', name: 'Encargado de Drones', systemName: 'drone_unit_leader' });

      const result = await service.create({ name: ' Encargado de Drones ', level: 4, weight: 5.5, systemName: 'drone_unit_leader' });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Encargado de Drones', systemName: 'drone_unit_leader' }),
      );
      expect(result.systemName).toBe('drone_unit_leader');
    });
  });

  describe('cargos del manual (catálogo protegido)', () => {
    it('no se crea un cargo con el nombre, un alias o la clave de uno del manual', async () => {
      await expect(service.create({ name: 'comandante del incidente', level: 1, weight: 1 })).rejects.toThrow(/Manual SCI/);
      await expect(service.create({ name: 'Jefe de Operaciones', level: 2, weight: 5 })).rejects.toThrow(/Manual SCI/);
      await expect(service.create({ name: 'Otro', level: 1, weight: 1, systemName: 'incident_commander' })).rejects.toThrow(/Manual SCI/);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('no se crea un cargo con un nombre retirado ni duplicado', async () => {
      await expect(service.create({ name: 'Paramédico', level: 4, weight: 5 })).rejects.toThrow(/no es un cargo del SCI/);
      qb.getOne.mockResolvedValue({ id: 'other', name: 'Encargado de Drones' });
      await expect(service.create({ name: 'encargado de drones', level: 4, weight: 5 })).rejects.toThrow(/Ya existe un cargo/);
    });

    it('un cargo del manual no se edita ni se elimina', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'ci', name: 'Comandante del Incidente', systemName: 'incident_commander' });
      await expect(service.update('ci', { weight: 3 })).rejects.toThrow(/Manual SCI/);
      await expect(service.delete('ci')).rejects.toThrow(/Manual SCI/);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('un cargo propio no se renombra como uno del manual', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'c', name: 'Encargado de Drones' });
      await expect(service.update('c', { name: 'Oficial de Seguridad' })).rejects.toThrow(/Manual SCI/);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('un cargo propio con asignaciones activas no se elimina', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'c', name: 'Encargado de Drones' });
      attendRepo.count.mockResolvedValue(2);
      await expect(service.delete('c')).rejects.toThrow(/2 asignación/);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('findAll marca cuáles son del manual', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 'ci', name: 'Comandante del Incidente', systemName: 'incident_commander' },
        { id: 'c', name: 'Encargado de Drones' },
      ]);
      const charges = await service.findAll();
      expect(charges.map((c) => c.isCatalog)).toEqual([true, false]);
    });
  });
});
