import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';

import { AuditLogInterceptor } from './audit-log.interceptor';
import { getAuditContext } from '../utils/audit-context.util';

describe('AuditLogInterceptor', () => {
  it('expone userId, userRole, ipAddress y entityId durante el handler', async () => {
    const interceptor = new AuditLogInterceptor();
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', role: 'manager' },
          ip: '10.0.0.1',
          params: { id: 'emg-1' },
          headers: {},
        }),
      }),
    };

    let seen: any;
    const handler: any = {
      handle: () => {
        seen = getAuditContext();
        return of({ success: true });
      },
    };

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(seen).toEqual({
      userId: 'user-1',
      userRole: 'manager',
      ipAddress: '10.0.0.1',
      entityId: 'emg-1',
    });
  });

  it('no rompe si el request no tiene usuario autenticado', async () => {
    const interceptor = new AuditLogInterceptor();
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined, headers: {} }),
      }),
    };

    let seen: any;
    const handler: any = {
      handle: () => {
        seen = getAuditContext();
        return of({});
      },
    };

    await lastValueFrom(interceptor.intercept(context, handler));

    expect(seen).toEqual({
      userId: undefined,
      userRole: undefined,
      ipAddress: undefined,
      entityId: undefined,
    });
  });
});
