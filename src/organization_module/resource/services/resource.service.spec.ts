import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ResourceService } from './resource.service';
import { ResourceEntity } from '../entities/resource.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { EquipmentService } from '../../../organization_module/equipment/services/equipment.service';
import { EmergencyStatus } from '../../../organization_module/emergency/enums/emergency-status.enum';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockEmergencyService: any;
  let mockResourceRepo: any;
  let mockEquipmentService: any;
  let mockManager: any;
  let mockQueryRunner: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockEmergencyService = {
      findOne: jest.fn(),
      assertEditable: jest.fn(),
    };
    mockResourceRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'res-1', ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn(),
      find: jest.fn(),
    };
    mockEquipmentService = {
      findOne: jest.fn().mockResolvedValue({
        id: 'eq-1',
        name: 'Casco',
        availableQuantity: 10,
      }),
    };
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn((entity: any, data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'res-1', ...data })),
    };
    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isReleased: false,
      manager: mockManager,
    };
    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        {
          provide: getRepositoryToken(ResourceEntity),
          useValue: mockResourceRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EmergencyService, useValue: mockEmergencyService },
        { provide: EquipmentService, useValue: mockEquipmentService },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - bloqueo de edición (F1-011)', () => {
    const dto = {
      emergencyId: 'emg-1',
      equipmentId: 'eq-1',
      amount: 2,
    } as any;

    it('lanza BadRequestException al crear recurso para emergencia finalizada', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Finished,
      });
      mockEmergencyService.assertEditable.mockImplementation(() => {
        throw new BadRequestException(
          'La emergencia está finalizada. No se permiten ediciones.',
        );
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        'La emergencia está finalizada. No se permiten ediciones.',
      );
      expect(mockResourceRepo.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException al crear recurso para emergencia cancelada', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Canceled,
      });
      mockEmergencyService.assertEditable.mockImplementation(() => {
        throw new BadRequestException(
          'La emergencia está cancelada. No se permiten ediciones.',
        );
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        'La emergencia está cancelada. No se permiten ediciones.',
      );
      expect(mockResourceRepo.save).not.toHaveBeenCalled();
    });

    it('permite crear recurso para emergencia activa', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Active,
      });
      mockEmergencyService.assertEditable.mockReturnValue(undefined);
      mockManager.findOne.mockResolvedValue({
        id: 'eq-1',
        name: 'Casco',
        availableQuantity: 10,
      });
      mockResourceRepo.findOne.mockResolvedValue({
        id: 'res-1',
        amount: 2,
        emergency: { id: 'emg-1' },
        equipment: { id: 'eq-1' },
      });

      const result = await service.create(dto, 'user-1');

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.id).toBe('res-1');
    });
  });

  describe('create - despacho de recursos y stock (F1-015)', () => {
    const dto = {
      emergencyId: 'emg-1',
      equipmentId: 'eq-1',
      amount: 5,
      note: 'Despacho de prueba',
    } as any;

    beforeEach(() => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Active,
      });
      mockEmergencyService.assertEditable.mockReturnValue(undefined);
      mockManager.findOne.mockResolvedValue({
        id: 'eq-1',
        name: 'Casco',
        availableQuantity: 10,
      });
      mockResourceRepo.findOne.mockResolvedValue({
        id: 'res-1',
        amount: 5,
        emergency: { id: 'emg-1' },
        equipment: { id: 'eq-1', name: 'Casco' },
      });
    });

    it('resta availableQuantity al despachar (AC1)', async () => {
      await service.create(dto, 'user-1');

      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ availableQuantity: 5 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('lanza BadRequestException si amount > availableQuantity (AC2)', async () => {
      mockEquipmentService.findOne.mockResolvedValue({
        id: 'eq-1',
        name: 'Casco',
        availableQuantity: 3,
      });

      await expect(
        service.create({ ...dto, amount: 5 }, 'user-1'),
      ).rejects.toThrow('Cantidad no disponible en inventario');
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('hace rollback si el stock cambia dentro de la transacción (AC5/AC6)', async () => {
      mockManager.findOne.mockResolvedValue({
        id: 'eq-1',
        name: 'Casco',
        availableQuantity: 3,
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        'Cantidad no disponible en inventario',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('registra ActionEntity con la descripción del despacho (AC4)', async () => {
      await service.create(dto, 'user-1');

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: 'Despacho de recurso: Casco x5',
          user: { id: 'user-1' },
          emergency: { id: 'emg-1' },
        }),
      );
    });
  });

  describe('returnResource - devolución de recursos (F1-016)', () => {
    const baseResource = {
      id: 'res-1',
      amount: 5,
      amount_returned: 0,
      emergency: { id: 'emg-1' },
      equipment: { id: 'eq-1', name: 'Casco' },
    };
    const lockedEquipment = {
      id: 'eq-1',
      name: 'Casco',
      availableQuantity: 10,
      totalQuantity: 20,
    };

    beforeEach(() => {
      mockResourceRepo.findOne.mockResolvedValue({ ...baseResource });
      mockManager.findOne.mockResolvedValue({ ...lockedEquipment });
    });

    it('suma amountReturned a availableQuantity y a amount_returned (AC1/AC2)', async () => {
      await service.returnResource('res-1', 3, 'user-1');

      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ availableQuantity: 13 }),
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount_returned: 3 }),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('lanza BadRequestException si amountReturned excede lo asignado (AC3)', async () => {
      await expect(
        service.returnResource('res-1', 6, 'user-1'),
      ).rejects.toThrow('Cantidad a devolver excede lo asignado');
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('rechaza devoluciones acumuladas que excedan lo asignado (AC3)', async () => {
      const resource = { ...baseResource };
      mockResourceRepo.findOne.mockResolvedValue(resource);

      await service.returnResource('res-1', 3, 'user-1');
      await expect(
        service.returnResource('res-1', 3, 'user-1'),
      ).rejects.toThrow('Cantidad a devolver excede lo asignado');
    });

    it('permite la devolución con emergencia finalizada (AC6)', async () => {
      mockResourceRepo.findOne.mockResolvedValue({
        ...baseResource,
        emergency: { id: 'emg-1', state: EmergencyStatus.Finished },
      });

      const result = await service.returnResource('res-1', 2, 'user-1');

      expect(mockEmergencyService.assertEditable).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.id).toBe('res-1');
    });

    it('registra ActionEntity con la descripción de la devolución (AC4)', async () => {
      await service.returnResource('res-1', 3, 'user-1');

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: 'Devolución de recurso: Casco x3',
          user: { id: 'user-1' },
          emergency: { id: 'emg-1' },
        }),
      );
    });

    it('hace rollback si la devolución supera totalQuantity (AC8)', async () => {
      mockManager.findOne.mockResolvedValue({
        ...lockedEquipment,
        availableQuantity: 19,
      });

      await expect(
        service.returnResource('res-1', 3, 'user-1'),
      ).rejects.toThrow('La devolución supera la cantidad total del equipo');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('update - bloqueo de edición (F1-011)', () => {
    it('lanza BadRequestException al actualizar recurso de emergencia finalizada', async () => {
      mockResourceRepo.findOne.mockResolvedValue({
        id: 'res-1',
        emergency: { id: 'emg-1', state: EmergencyStatus.Finished },
      });
      mockEmergencyService.assertEditable.mockImplementation(() => {
        throw new BadRequestException(
          'La emergencia está finalizada. No se permiten ediciones.',
        );
      });

      await expect(
        service.update('res-1', { amount: 5 } as any),
      ).rejects.toThrow(
        'La emergencia está finalizada. No se permiten ediciones.',
      );
      expect(mockResourceRepo.update).not.toHaveBeenCalled();
    });

    it('permite actualizar recurso de emergencia activa', async () => {
      mockResourceRepo.findOne.mockResolvedValue({
        id: 'res-1',
        emergency: { id: 'emg-1', state: EmergencyStatus.Active },
      });
      mockEmergencyService.assertEditable.mockReturnValue(undefined);
      mockResourceRepo.findOne.mockResolvedValue({
        id: 'res-1',
        amount: 5,
        emergency: { id: 'emg-1', state: EmergencyStatus.Active },
      });

      const result = await service.update('res-1', { amount: 5 } as any);

      expect(mockResourceRepo.update).toHaveBeenCalled();
      expect(result.amount).toBe(5);
    });
  });

  describe('delete - soft delete (F1-012)', () => {
    it('marca is_deleted = true en vez de borrar físicamente', async () => {
      mockResourceRepo.findOne.mockResolvedValue({
        id: 'res-1',
        emergency: { id: 'emg-1', state: EmergencyStatus.Active },
      });

      const result = await service.delete('res-1');

      expect(mockResourceRepo.update).toHaveBeenCalledWith('res-1', {
        isDeleted: true,
      });
      expect(mockResourceRepo.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('findByEmergencyId - excluye recursos soft-deleted (F1-012)', () => {
    it('filtra por isDeleted: false', async () => {
      mockEmergencyService.findOne.mockResolvedValue({ id: 'emg-1' });
      mockResourceRepo.find.mockResolvedValue([]);

      await service.findByEmergencyId('emg-1');

      expect(mockResourceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            emergency: { id: 'emg-1' },
            isDeleted: false,
          },
        }),
      );
    });
  });
});
