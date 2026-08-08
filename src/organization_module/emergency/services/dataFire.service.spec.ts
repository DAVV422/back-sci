import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DataFireService } from './dataFire.service';
import { DataFireEntity } from '../entities/dataFires.entity';
import { EmergencyService } from './emergency.service';

describe('DataFireService', () => {
  let service: DataFireService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'df-1',
        temperature: 120,
        isDeleted: false,
      }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'df-1', ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataFireService,
        { provide: getRepositoryToken(DataFireEntity), useValue: mockRepo },
        {
          provide: EmergencyService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'emg-1' }) },
        },
      ],
    }).compile();

    service = module.get<DataFireService>(DataFireService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('delete - soft delete (F1-012)', () => {
    it('marca is_deleted = true en vez de borrar físicamente', async () => {
      const result = await service.delete('df-1');

      expect(mockRepo.update).toHaveBeenCalledWith('df-1', {
        isDeleted: true,
      });
      expect(mockRepo.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('lanza BadRequestException si el update no afecta filas', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'df-1' });
      mockRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.delete('df-1')).rejects.toThrow(
        'Datos de incendio no eliminado.',
      );
    });
  });

  describe('queries - excluyen registros soft-deleted (F1-012)', () => {
    it('findOne filtra por isDeleted: false', async () => {
      await service.findOne('df-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'df-1', isDeleted: false },
      });
    });

    it('findByEmergencyId filtra por isDeleted: false', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'df-1' }]);

      await service.findByEmergencyId('emg-1');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { emergency: { id: 'emg-1' }, isDeleted: false },
      });
    });

    it('findAll agrega filtro is_deleted = false a la query', async () => {
      await service.findAll({} as any);

      const queryBuilder = mockRepo.createQueryBuilder.mock.results[0].value;
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'dataFire.is_deleted = false',
      );
    });
  });
});
