/**
 * Contrato de eventos en tiempo real emitidos por el namespace `/notifications`.
 *
 * Los eventos son de invalidación: solo informan QUÉ cambió (entidad, id, operación)
 * y el cliente vuelve a consultar el recurso por HTTP. Así nunca viajan por el socket
 * datos sensibles ni relaciones profundas sin pasar por el serializador de la API.
 */
export enum EmergencySocketEvent {
  NEW_ACTION = 'new_action',
  TRIAGE_UPDATE = 'triage_update',
  FORM207_UPDATE = 'form207_update',
  FORM201_UPDATE = 'form201_update',
  RESOURCE_UPDATE = 'resource_update',
  PERSONNEL_UPDATE = 'personnel_update',
  EMERGENCY_UPDATE = 'emergency_update',
}

export type RealtimeEntity =
  | 'action'
  | 'registration'
  | 'form207'
  | 'form201'
  | 'resource'
  | 'attend'
  | 'emergency';

export type RealtimeOperation = 'insert' | 'update' | 'delete';

export interface EmergencyRealtimePayload {
  emergencyId: string;
  entity: RealtimeEntity;
  entityId?: string;
  operation: RealtimeOperation;
  at: string;
}

export const ENTITY_SOCKET_EVENT: Record<RealtimeEntity, EmergencySocketEvent> = {
  action: EmergencySocketEvent.NEW_ACTION,
  registration: EmergencySocketEvent.TRIAGE_UPDATE,
  form207: EmergencySocketEvent.FORM207_UPDATE,
  form201: EmergencySocketEvent.FORM201_UPDATE,
  resource: EmergencySocketEvent.RESOURCE_UPDATE,
  attend: EmergencySocketEvent.PERSONNEL_UPDATE,
  emergency: EmergencySocketEvent.EMERGENCY_UPDATE,
};

export const emergencyRoom = (emergencyId: string): string =>
  `emergency_${emergencyId}`;
