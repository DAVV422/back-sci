import { Injectable, Logger } from '@nestjs/common';

import { NotificationGateway } from '../gateways/notification.gateway';
import {
  ENTITY_SOCKET_EVENT,
  EmergencyRealtimePayload,
  RealtimeEntity,
  RealtimeOperation,
} from '../realtime/realtime-events';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('RealtimeService');

  constructor(private readonly notificationGateway: NotificationGateway) {}

  /**
   * Notifica a los clientes suscritos a la sala de la emergencia que una entidad cambió.
   * Los cambios de la propia emergencia se difunden a todos los clientes conectados
   * (dashboard y listado global también deben reaccionar).
   */
  notifyEmergency(
    emergencyId: string,
    entity: RealtimeEntity,
    operation: RealtimeOperation,
    entityId?: string,
  ): void {
    if (!emergencyId) return;
    const payload: EmergencyRealtimePayload = {
      emergencyId,
      entity,
      entityId,
      operation,
      at: new Date().toISOString(),
    };
    const event = ENTITY_SOCKET_EVENT[entity];
    try {
      if (entity === 'emergency') {
        this.notificationGateway.broadcast(event, payload);
      } else {
        this.notificationGateway.emitToEmergency(emergencyId, event, payload);
      }
    } catch (error) {
      // El tiempo real nunca debe romper la operación de negocio que lo originó.
      this.logger.error(
        `[notifyEmergency] Error emitiendo ${event} emergencyId=${emergencyId}: ${error.message}`,
      );
    }
  }
}
