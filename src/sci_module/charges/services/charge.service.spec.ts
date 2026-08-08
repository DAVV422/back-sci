import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ChargeService } from './charge.service';
import { ChargeEntity } from '../entities/charges.entity';

describe('ChargeService', () => {
  let service: ChargeService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'charge-1', name: 'comandante' }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (data: any) => ({ id: 'charge-1', ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
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
      await service.findByName('comandante');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'comandante', isDeleted: false },
      });
    });

    it('findAll filtra por isDeleted: false', async () => {
      await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { isDeleted: false },
      });
    });
  });
});
