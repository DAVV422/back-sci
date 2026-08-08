import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';

export interface AuditLogParams {
  userId?: string;
  userRole?: string;
  eventType: 'CREATE' | 'UPDATE' | 'DELETE';
  entityName: string;
  entityId?: string;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLogService');

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  public async log(params: AuditLogParams): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        user: params.userId ? { id: params.userId } : null,
        userRole: params.userRole,
        eventType: params.eventType,
        entityName: params.entityName,
        entityId: params.entityId,
        oldValues: params.oldValues ?? null,
        newValues: params.newValues ?? null,
        ipAddress: params.ipAddress,
      });
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error('No se pudo persistir el audit log', error);
    }
  }
}
