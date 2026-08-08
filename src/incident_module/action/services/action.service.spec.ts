import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ActionService } from './action.service';
import { ActionEntity } from '../entities/action.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { EmergencyStatus } from '../../../organization_module/emergency/enums/emergency-status.enum';

describe('ActionService', () => {
  let service: ActionService;
  let mockEmergencyService: any;
  let mockActionRepo: any;

  beforeEach(async () => {
    mockEmergencyService = {
      findOne: jest.fn(),
      assertEditable: jest.fn(),
    };
    mockActionRepo = {
      findOne: jest.fn(),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'act-1', ...data })),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionService,
        { provide: getRepositoryToken(ActionEntity), useValue: mockActionRepo },
        { provide: EmergencyService, useValue: mockEmergencyService },
        {
          provide: UserService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'user-1' }) },
        },
      ],
    }).compile();

    service = module.get<ActionService>(ActionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - bloqueo de edición (F1-011)', () => {
    const dto = {
      emergency: 'emg-1',
      description: 'Abrir vía de acceso',
      date: new Date('2024-06-19'),
      hour: '15:00',
    } as any;

    it('lanza BadRequestException al crear acción para emergencia finalizada', async () => {
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
      expect(mockActionRepo.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException al crear acción para emergencia cancelada', async () => {
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
      expect(mockActionRepo.save).not.toHaveBeenCalled();
    });

    it('permite crear acción para emergencia activa', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Active,
      });
      mockEmergencyService.assertEditable.mockReturnValue(undefined);

      const result = await service.create(dto, 'user-1');

      expect(mockActionRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('act-1');
    });
  });
});
