import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { EquipmentService } from './equipment.service';
import { EquipmentEntity } from '../entities/equipment.entity';

describe('EquipmentService', () => {
  let service: EquipmentService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'eq-1', ...data })),
      findOne: jest.fn().mockResolvedValue({
        id: 'eq-1',
        name: 'Camión cisterna',
        isDeleted: false,
      }),
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
        EquipmentService,
        { provide: getRepositoryToken(EquipmentEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('delete - soft delete (F1-012)', () => {
    it('marca is_deleted = true en vez de borrar físicamente', async () => {
      const result = await service.delete('eq-1');

      expect(mockRepo.update).toHaveBeenCalledWith('eq-1', {
        isDeleted: true,
      });
      expect(mockRepo.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('lanza BadRequestException si el update no afecta filas', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'eq-1' });
      mockRepo.update.mockResolvedValue({ affected: 0 });

      await expect(service.delete('eq-1')).rejects.toThrow(
        'Equipo no eliminado.',
      );
    });
  });

  describe('findAll - excluye registros soft-deleted (F1-012)', () => {
    it('agrega filtro is_deleted = false a la query', async () => {
      await service.findAll({} as any);

      const queryBuilder = mockRepo.createQueryBuilder.mock.results[0].value;
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'equipment.is_deleted = false',
      );
    });
  });

  describe('create - integridad de stock', () => {
    it('rechaza disponible mayor que el total', async () => {
      await expect(
        service.create({ name: 'Bomba', description: '', totalQuantity: 2, availableQuantity: 3 }),
      ).rejects.toThrow('La cantidad disponible no puede superar la cantidad total.');
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update - integridad de stock', () => {
    beforeEach(() => {
      mockRepo.findOne.mockResolvedValue({
        id: 'eq-1',
        name: 'Bomba',
        totalQuantity: 10,
        availableQuantity: 6, // 4 despachadas
        isDeleted: false,
      });
    });

    it('ignora availableQuantity enviado por el cliente', async () => {
      await service.update('eq-1', { name: 'Bomba portátil', availableQuantity: 99 });
      expect(mockRepo.update).toHaveBeenCalledWith('eq-1', { name: 'Bomba portátil' });
    });

    it('ajusta el disponible por la diferencia al cambiar el total', async () => {
      await service.update('eq-1', { totalQuantity: 12 });
      expect(mockRepo.update).toHaveBeenCalledWith('eq-1', {
        totalQuantity: 12,
        availableQuantity: 8,
      });
    });

    it('rechaza un total menor a lo despachado', async () => {
      await expect(service.update('eq-1', { totalQuantity: 3 })).rejects.toThrow(
        'La cantidad total no puede ser menor a las 4 unidades actualmente despachadas.',
      );
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });
});
