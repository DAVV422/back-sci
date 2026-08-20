import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogSubscriber } from './subscribers/audit-log.subscriber';
import { SyncService } from './services/sync.service';
import { SyncController } from './controllers/sync.controller';

import { EmergencyModule } from '../organization_module/emergency/emergency.module';
import { Form201Module } from '../incident_module/form-201/form-201.module';
import { Form207Module } from '../victim_registry_module/form-207/form-207.module';
import { VictimModule } from '../victim_registry_module/victim/victim.module';
import { RegistrationModule } from '../victim_registry_module/registration/registration.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLogEntity]),
    forwardRef(() => EmergencyModule),
    forwardRef(() => Form201Module),
    forwardRef(() => Form207Module),
    forwardRef(() => VictimModule),
    forwardRef(() => RegistrationModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [SyncController],
  providers: [AuditLogService, AuditLogSubscriber, SyncService],
  exports: [AuditLogService, SyncService],
})
export class CommonModule {}
