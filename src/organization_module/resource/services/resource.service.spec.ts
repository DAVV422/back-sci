import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ResourceService } from './resource.service';
import { ResourceEntity } from '../entities/resource.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { EquipmentService } from '../../../organization_module/equipment/services/equipment.service';
import { EmergencyStatus } from '../../../organization_module/emergency/enums/emergency-status.enum';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockEmergencyService: any;
  let mockResourceRepo: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceService,
        {
          provide: getRepositoryToken(ResourceEntity),
          useValue: mockResourceRepo,
        },
        { provide: EmergencyService, useValue: mockEmergencyService },
        {
          provide: EquipmentService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'eq-1' }) },
        },
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

      await expect(service.create(dto)).rejects.toThrow(
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

      await expect(service.create(dto)).rejects.toThrow(
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

      const result = await service.create(dto);

      expect(mockResourceRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('res-1');
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
