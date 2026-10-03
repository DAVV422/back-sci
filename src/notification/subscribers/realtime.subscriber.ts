import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  UpdateEvent,
} from 'typeorm';

import { ActionEntity } from '../../incident_module/action/entities/action.entity';
import { Form201Entity } from '../../incident_module/form-201/entities/form-201.entity';
import { AttendEntity } from '../../organization_module/attends/entities/attends.entity';
import { EmergencyEntity } from '../../organization_module/emergency/entities/emergency.entity';
import { ResourceEntity } from '../../organization_module/resource/entities/resource.entity';
import { Form207Entity } from '../../victim_registry_module/form-207/entities/form-207.entity';
import { RegistrationEntity } from '../../victim_registry_module/registration/entities/registration.entity';
import { RealtimeService } from '../services/realtime.service';
import {
  RealtimeEntity,
  RealtimeOperation,
} from '../realtime/realtime-events';

interface PendingRealtimeEvent {
  emergencyId: string;
  entity: RealtimeEntity;
  entityId?: string;
  operation: RealtimeOperation;
}

const PENDING_KEY = 'pendingRealtimeEvents';

/**
 * Detecta cambios persistidos en las entidades operativas de una emergencia y los
 * difunde por WebSocket. Los eventos se encolan en el QueryRunner y se emiten solo
 * después del COMMIT, para no anunciar cambios que luego se revierten.
 *
 * Cubre inserciones y `save()` de entidades cargadas. Las mutaciones hechas con
 * `repository.update(id, ...)` no exponen la emergencia en el evento; esos servicios
 * notifican explícitamente vía `RealtimeService`.
 */
@Injectable()
export class RealtimeSubscriber
  implements EntitySubscriberInterface, OnApplicationBootstrap
{
  private readonly logger = new Logger('RealtimeSubscriber');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly realtimeService: RealtimeService,
  ) {}

  onApplicationBootstrap(): void {
    this.dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<any>): void {
    this.enqueue(event.queryRunner, event.metadata.target, event.entity, 'insert');
  }

  afterUpdate(event: UpdateEvent<any>): void {
    const entity = event.entity ?? event.databaseEntity;
    const operation: RealtimeOperation =
      entity?.isDeleted === true ? 'delete' : 'update';
    this.enqueue(event.queryRunner, event.metadata.target, entity, operation);
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    const pending = this.takePending(event.queryRunner);
    for (const item of pending) {
      this.realtimeService.notifyEmergency(
        item.emergencyId,
        item.entity,
        item.operation,
        item.entityId,
      );
    }
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    this.takePending(event.queryRunner);
  }

  private enqueue(
    queryRunner: QueryRunner,
    target: unknown,
    entity: any,
    operation: RealtimeOperation,
  ): void {
    if (!entity) return;
    const resolved = this.resolve(target, entity);
    if (!resolved) return;

    const item: PendingRealtimeEvent = { ...resolved, operation };
    if (!queryRunner?.isTransactionActive) {
      this.realtimeService.notifyEmergency(
        item.emergencyId,
        item.entity,
        item.operation,
        item.entityId,
      );
      return;
    }

    const data = (queryRunner.data ??= {});
    const pending: PendingRealtimeEvent[] = (data[PENDING_KEY] ??= []);
    const duplicated = pending.some(
      (p) =>
        p.entity === item.entity &&
        p.entityId === item.entityId &&
        p.operation === item.operation,
    );
    if (!duplicated) pending.push(item);
  }

  private takePending(queryRunner: QueryRunner): PendingRealtimeEvent[] {
    const data = queryRunner?.data;
    if (!data || !data[PENDING_KEY]) return [];
    const pending: PendingRealtimeEvent[] = data[PENDING_KEY];
    delete data[PENDING_KEY];
    return pending;
  }

  private resolve(
    target: unknown,
    entity: any,
  ): Omit<PendingRealtimeEvent, 'operation'> | null {
    try {
      switch (target) {
        case EmergencyEntity:
          return entity.id
            ? { emergencyId: entity.id, entity: 'emergency', entityId: entity.id }
            : null;
        case ActionEntity:
          return this.fromEmergencyRelation('action', entity);
        case ResourceEntity:
          return this.fromEmergencyRelation('resource', entity);
        case AttendEntity:
          return this.fromEmergencyRelation('attend', entity);
        case Form207Entity:
          return this.fromEmergencyRelation('form207', entity);
        case Form201Entity:
          return this.fromEmergencyRelation('form201', entity);
        case RegistrationEntity: {
          const emergencyId = entity.form207?.emergency?.id;
          return emergencyId
            ? { emergencyId, entity: 'registration', entityId: entity.id }
            : null;
        }
        default:
          return null;
      }
    } catch (error) {
      this.logger.warn(`[resolve] No se pudo resolver la emergencia: ${error.message}`);
      return null;
    }
  }

  private fromEmergencyRelation(
    entityName: RealtimeEntity,
    entity: any,
  ): Omit<PendingRealtimeEvent, 'operation'> | null {
    const emergencyId = entity.emergency?.id;
    return emergencyId
      ? { emergencyId, entity: entityName, entityId: entity.id }
      : null;
  }
}
