import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AuditLogSubscriber } from './audit-log.subscriber';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { auditContextStorage } from '../utils/audit-context.util';

describe('AuditLogSubscriber', () => {
  let subscriber: AuditLogSubscriber;
  let mockAuditService: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };
    mockDataSource = { subscribers: [] };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogSubscriber,
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditLogService, useValue: mockAuditService },
      ],
    }).compile();

    subscriber = module.get<AuditLogSubscriber>(AuditLogSubscriber);
  });

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  it('se registra en el DataSource al iniciar la app', async () => {
    await subscriber.onApplicationBootstrap();
    expect(mockDataSource.subscribers).toContain(subscriber);
  });

  it('afterInsert registra CREATE con new_values', async () => {
    const event = {
      metadata: { target: { name: 'EmergencyEntity' } },
      entity: { id: 'emg-1', state: 'active' },
    };

    subscriber.afterInsert(event as any);

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'CREATE',
        entityName: 'EmergencyEntity',
        entityId: 'emg-1',
        newValues: { id: 'emg-1', state: 'active' },
      }),
    );
  });

  it('beforeUpdate registra UPDATE con old_values y new_values', async () => {
    const event = {
      metadata: { target: { name: 'EmergencyEntity' } },
      entity: { id: 'emg-1', state: 'finished' },
      databaseEntity: { id: 'emg-1', state: 'active' },
    };

    await subscriber.beforeUpdate(event as any);

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'UPDATE',
        entityName: 'EmergencyEntity',
        entityId: 'emg-1',
        oldValues: { id: 'emg-1', state: 'active' },
        newValues: { id: 'emg-1', state: 'finished' },
      }),
    );
  });

  it('beforeUpdate detecta soft delete como DELETE (AC3)', async () => {
    const event = {
      metadata: { target: { name: 'EmergencyEntity' } },
      entity: { isDeleted: true },
      databaseEntity: { id: 'emg-1', state: 'active', isDeleted: false },
    };

    await subscriber.beforeUpdate(event as any);

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'DELETE',
        entityName: 'EmergencyEntity',
        entityId: 'emg-1',
        oldValues: { id: 'emg-1', state: 'active', isDeleted: false },
        newValues: null,
      }),
    );
  });

  it('usa el contexto del request para userId, userRole e ip', async () => {
    await auditContextStorage.run(
      {
        userId: 'user-1',
        userRole: 'manager',
        ipAddress: '10.0.0.1',
        entityId: 'emg-1',
      },
      async () => {
        const event = {
          metadata: { target: { name: 'EmergencyEntity' } },
          entity: { isDeleted: true },
        };

        await subscriber.beforeUpdate(event as any);
      },
    );

    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        userRole: 'manager',
        ipAddress: '10.0.0.1',
        entityId: 'emg-1',
      }),
    );
  });

  it('omite el propio AuditLogEntity (evita recursión)', async () => {
    const event = {
      metadata: { target: AuditLogEntity },
      entity: { id: 'audit-1' },
    };

    subscriber.afterInsert(event as any);

    expect(mockAuditService.log).not.toHaveBeenCalled();
  });
});
