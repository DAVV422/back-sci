import { Injectable, Logger } from '@nestjs/common';
import { SyncBatchDto, SyncOperationResult } from '../dto/sync-batch.dto';
import { EmergencyService } from '../../organization_module/emergency/services/emergency.service';
import { Form201Service } from '../../incident_module/form-201/services/form-201.service';
import { Form207Service } from '../../victim_registry_module/form-207/services/form-207.service';
import { VictimService } from '../../victim_registry_module/victim/services/victim.service';
import { RegistrationService } from '../../victim_registry_module/registration/services/registration.service';
import { ActionService } from '../../incident_module/action/services/action.service';
import { NotificationService } from '../../notification/services/notification.service';
import { EmergencyStatus } from '../../organization_module/emergency/enums/emergency-status.enum';

@Injectable()
export class SyncService {
  private readonly logger = new Logger('SyncService');

  constructor(
    private readonly emergencyService: EmergencyService,
    private readonly form201Service: Form201Service,
    private readonly form207Service: Form207Service,
    private readonly victimService: VictimService,
    private readonly registrationService: RegistrationService,
    private readonly actionService: ActionService,
    private readonly notificationService: NotificationService,
  ) {}

  async processBatch(
    syncBatchDto: SyncBatchDto,
    userId: string,
  ): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = [];

    for (const op of syncBatchDto.operations) {
      try {
        // 1. Extraer ID de la emergencia vinculada si aplica
        const emergencyId =
          op.emergencyId ||
          op.payload?.emergencyId ||
          op.payload?.emergency;

        // 2. Verificar estado de la emergencia
        if (emergencyId) {
          try {
            const emergency = await this.emergencyService.findOne(emergencyId);
            if (
              emergency.state === EmergencyStatus.Finished ||
              emergency.state === EmergencyStatus.Canceled
            ) {
              // Notificar conflicto
              const emgCode = emergency.code || emergencyId;
              await this.notificationService.sendNotification({
                userId,
                type: 'sync_conflict',
                title: 'Conflicto de Sincronización Offline',
                message: `No se pudo sincronizar la operación de ${op.entity} debido a que la emergencia ${emgCode} ya se encuentra cerrada.`,
              });

              results.push({
                clientGeneratedId: op.clientGeneratedId,
                entity: op.entity,
                action: op.action,
                status: 'conflict',
                error: 'SYNC_CONFLICT_EMERGENCY_CLOSED',
              });
              continue;
            }
          } catch (e) {
            this.logger.warn(
              `No se pudo verificar el estado de la emergencia ${emergencyId}: ${e.message}`,
            );
          }
        }

        // 3. Ejecutar la operación según la entidad
        let createdOrUpdated: any = null;

        if (op.entity === 'form201') {
          if (op.action === 'create') {
            createdOrUpdated = await this.form201Service.create(
              emergencyId,
              op.payload,
              userId,
            );
          } else if (op.action === 'update' && op.payload.id) {
            createdOrUpdated = await this.form201Service.update(
              op.payload.id,
              op.payload,
            );
          }
        } else if (op.entity === 'form207') {
          if (op.action === 'create') {
            createdOrUpdated = await this.form207Service.create(
              emergencyId,
              op.payload,
              userId,
            );
          }
        } else if (op.entity === 'victim') {
          if (op.action === 'create') {
            createdOrUpdated = await this.victimService.create(op.payload);
          } else if (op.action === 'update' && op.payload.id) {
            createdOrUpdated = await this.victimService.update(
              op.payload.id,
              op.payload,
            );
          }
        } else if (op.entity === 'registration') {
          if (op.action === 'create') {
            const form207Id = op.payload.form207Id;
            createdOrUpdated = await this.registrationService.create(
              form207Id,
              op.payload,
              userId,
            );
          }
        } else if (op.entity === 'action') {
          if (op.action === 'create') {
            createdOrUpdated = await this.actionService.create(
              {
                ...op.payload,
                emergency: emergencyId || op.payload.emergency,
                clientGeneratedId: op.clientGeneratedId,
              },
              userId,
            );
          } else if (op.action === 'update' && op.payload.id) {
            createdOrUpdated = await this.actionService.update(
              op.payload.id,
              op.payload,
            );
          }
        }

        results.push({
          clientGeneratedId: op.clientGeneratedId,
          entity: op.entity,
          action: op.action,
          status: 'success',
          serverId: createdOrUpdated?.id,
        });
      } catch (error) {
        this.logger.error(
          `Error procesando operación offline ${op.clientGeneratedId}: ${error.message}`,
        );
        results.push({
          clientGeneratedId: op.clientGeneratedId,
          entity: op.entity,
          action: op.action,
          status: 'error',
          error: error.message,
        });
      }
    }

    return results;
  }
}
