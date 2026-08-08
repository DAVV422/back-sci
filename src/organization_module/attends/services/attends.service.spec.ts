import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AttendService } from './attends.service';
import { AttendEntity } from '../entities/attends.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { ChargeService } from '../../../sci_module/charges/services/charge.service';
import { EmergencyStatus } from '../../../organization_module/emergency/enums/emergency-status.enum';

describe('AttendService', () => {
  let service: AttendService;
  let mockEmergencyService: any;
  let mockAttendRepo: any;

  beforeEach(async () => {
    mockEmergencyService = {
      findOne: jest.fn(),
      assertEditable: jest.fn(),
    };
    mockAttendRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'att-1',
        user: { id: 'user-1' },
        charge: { id: 'charge-1' },
      }),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'att-1', ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendService,
        { provide: getRepositoryToken(AttendEntity), useValue: mockAttendRepo },
        {
          provide: UserService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'user-1' }) },
        },
        { provide: EmergencyService, useValue: mockEmergencyService },
        {
          provide: ChargeService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'charge-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<AttendService>(AttendService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create - bloqueo de edición (F1-011)', () => {
    const dto = {
      user: 'user-1',
      emergency: 'emg-1',
      charge: 'charge-1',
      check_in_time: '08:00',
    } as any;

    it('lanza BadRequestException al crear asistencia para emergencia finalizada', async () => {
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
      expect(mockAttendRepo.save).not.toHaveBeenCalled();
    });

    it('permite crear asistencia para emergencia activa', async () => {
      mockEmergencyService.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Active,
      });
      mockEmergencyService.assertEditable.mockReturnValue(undefined);

      const result = await service.create(dto);

      expect(mockAttendRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('att-1');
    });
  });

  describe('delete - bloqueo de edición (F1-011)', () => {
    it('lanza BadRequestException al eliminar asistencia de emergencia finalizada', async () => {
      mockAttendRepo.findOne.mockResolvedValue({
        id: 'att-1',
        emergency: { id: 'emg-1', state: EmergencyStatus.Finished },
      });
      mockEmergencyService.assertEditable.mockImplementation(() => {
        throw new BadRequestException(
          'La emergencia está finalizada. No se permiten ediciones.',
        );
      });

      await expect(service.delete('att-1')).rejects.toThrow(
        'La emergencia está finalizada. No se permiten ediciones.',
      );
      expect(mockAttendRepo.update).not.toHaveBeenCalled();
    });

    it('permite eliminar asistencia de emergencia activa', async () => {
      mockAttendRepo.findOne.mockResolvedValue({
        id: 'att-1',
        emergency: { id: 'emg-1', state: EmergencyStatus.Active },
      });
      mockEmergencyService.assertEditable.mockReturnValue(undefined);

      const result = await service.delete('att-1');

      expect(mockAttendRepo.update).toHaveBeenCalledWith('att-1', {
        isDeleted: true,
      });
      expect(result.success).toBe(true);
    });
  });
});
