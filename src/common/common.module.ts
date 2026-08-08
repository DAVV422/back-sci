import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogSubscriber } from './subscribers/audit-log.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditLogService, AuditLogSubscriber],
  exports: [AuditLogService],
})
export class CommonModule {}
