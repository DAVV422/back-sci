import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuditLogService } from './audit-log.service';
import { AuditLogEntity } from '../entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'audit-1', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLogEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('persiste un registro con todos los campos', async () => {
    await service.log({
      userId: 'user-1',
      userRole: 'manager',
      eventType: 'CREATE',
      entityName: 'EmergencyEntity',
      entityId: 'emg-1',
      newValues: { state: 'active' },
      ipAddress: '127.0.0.1',
    });

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 'user-1' },
        userRole: 'manager',
        eventType: 'CREATE',
        entityName: 'EmergencyEntity',
        entityId: 'emg-1',
        newValues: { state: 'active' },
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('persiste old_values y new_values como jsonb', async () => {
    await service.log({
      eventType: 'UPDATE',
      entityName: 'EmergencyEntity',
      entityId: 'emg-1',
      oldValues: { state: 'active', name: 'Incendio' },
      newValues: { state: 'finished', name: 'Incendio' },
    });

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldValues: { state: 'active', name: 'Incendio' },
        newValues: { state: 'finished', name: 'Incendio' },
      }),
    );
  });

  it('no lanza error si la persistencia falla (AC7)', async () => {
    mockRepo.save.mockRejectedValue(new Error('db error'));

    await expect(
      service.log({
        eventType: 'CREATE',
        entityName: 'EmergencyEntity',
        entityId: 'emg-1',
      }),
    ).resolves.toBeUndefined();
  });
});
