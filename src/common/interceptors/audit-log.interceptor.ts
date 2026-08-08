import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContextStorage } from '../utils/audit-context.util';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request: any = context.switchToHttp().getRequest();
    const forwarded = request.headers?.['x-forwarded-for'];
    return auditContextStorage.run(
      {
        userId: request.user?.id,
        userRole: request.user?.role,
        ipAddress:
          request.ip ?? (Array.isArray(forwarded) ? forwarded[0] : forwarded),
        entityId: request.params?.id,
      },
      () => next.handle(),
    );
  }
}
