import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContext {
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  entityId?: string;
}

export const auditContextStorage = new AsyncLocalStorage<AuditContext>();

export function getAuditContext(): AuditContext | undefined {
  return auditContextStorage.getStore();
}
