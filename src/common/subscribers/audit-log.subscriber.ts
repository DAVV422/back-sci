import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { instanceToPlain } from 'class-transformer';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { getAuditContext } from '../utils/audit-context.util';

@Injectable()
@EventSubscriber()
export class AuditLogSubscriber
  implements EntitySubscriberInterface, OnApplicationBootstrap
{
  private readonly logger = new Logger('AuditLogSubscriber');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.dataSource.subscribers.push(this);
  }

  private shouldSkip(target: unknown): boolean {
    return target === AuditLogEntity;
  }

  private getTargetName(target: unknown): string {
    if (typeof target === 'string') return target;
    if (typeof target === 'function') return (target as { name: string }).name;
    if (target && typeof target === 'object' && 'name' in target) {
      return String((target as { name: unknown }).name);
    }
    return '';
  }

  private snapshot(entity: unknown): Record<string, any> | null {
    if (!entity) return null;
    try {
      return instanceToPlain(entity, {
        excludePrefixes: ['password'],
      }) as Record<string, any>;
    } catch {
      return null;
    }
  }

  afterInsert(event: InsertEvent<any>): Promise<void> | void {
    if (this.shouldSkip(event.metadata.target)) return;
    const context = getAuditContext();
    return this.auditLogService.log({
      userId: context?.userId,
      userRole: context?.userRole,
      ipAddress: context?.ipAddress,
      eventType: 'CREATE',
      entityName: this.getTargetName(event.metadata.target),
      entityId: event.entity?.id ?? event.entityId?.id,
      newValues: this.snapshot(event.entity),
    });
  }

  async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
    if (this.shouldSkip(event.metadata.target)) return;
    const context = getAuditContext();
    let entityId =
      event.entity?.id ?? event.databaseEntity?.id ?? context?.entityId;
    let oldValues = event.databaseEntity ?? null;
    if (!oldValues && entityId) {
      try {
        oldValues = await event.manager.findOne(event.metadata.target as any, {
          where: { id: entityId },
        });
      } catch (error) {
        this.logger.error(
          'No se pudieron obtener los valores previos para auditoría',
          error,
        );
      }
    }
    if (!entityId) entityId = oldValues?.id;
    const oldIsDeleted = Boolean(oldValues?.isDeleted);
    const newIsDeleted = Boolean(event.entity?.isDeleted);
    const isSoftDelete = newIsDeleted && !oldIsDeleted;
    return this.auditLogService.log({
      userId: context?.userId,
      userRole: context?.userRole,
      ipAddress: context?.ipAddress,
      eventType: isSoftDelete ? 'DELETE' : 'UPDATE',
      entityName: this.getTargetName(event.metadata.target),
      entityId,
      oldValues: this.snapshot(oldValues),
      newValues: isSoftDelete ? null : this.snapshot(event.entity),
    });
  }

  beforeRemove(event: RemoveEvent<any>): Promise<void> | void {
    if (this.shouldSkip(event.metadata.target)) return;
    const context = getAuditContext();
    return this.auditLogService.log({
      userId: context?.userId,
      userRole: context?.userRole,
      ipAddress: context?.ipAddress,
      eventType: 'DELETE',
      entityName: this.getTargetName(event.metadata.target),
      entityId:
        event.entity?.id ?? event.entityId?.id ?? event.databaseEntity?.id,
      oldValues: this.snapshot(event.databaseEntity ?? event.entity),
    });
  }
}
