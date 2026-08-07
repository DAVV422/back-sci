# SPEC-F1-017: Entidad `AuditLogEntity` e interceptor de auditoría global

## Regla de referencia

- [plan_implementacion.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Tabla `audit_log`
- [reglas_implementacion.md §2.1](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Tabla y flujo de auditoría global

## Descripción

Crear la entidad de auditoría y un interceptor NestJS que registre automáticamente las operaciones de escritura (CREATE, UPDATE, DELETE) en todas las entidades operativas. El objetivo es garantizar trazabilidad operacional completa.

## Estado actual

- No existe entidad de auditoría.
- No existe interceptor ni suscriptor de eventos para auditoría.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/common/entities/audit-log.entity.ts` — Entidad de auditoría |
| [NEW] | `src/common/interceptors/audit-log.interceptor.ts` — Interceptor NestJS para capturar operaciones de escritura |
| [NEW] | `src/common/services/audit-log.service.ts` — Servicio para persistir logs de auditoría |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/app.module.ts` | Registrar `AuditLogEntity` en TypeORM |
| [MODIFY] | `src/common/common.module.ts` | Exportar `AuditLogService` |

## Modelo de datos: `AuditLogEntity`

> **Nota**: esta entidad NO hereda de `BaseEntity` ya que es un log inmutable sin `updatedAt` ni `isDeleted`.

| Campo | Tipo | Notas |
|:---|:---|:---|
| `id` | UUID, PK | Auto-generado |
| `user_id` | UUID, FK → user, nullable | Nullable si es operación del sistema |
| `user_role` | varchar(50), nullable | Rol del usuario al momento de la operación |
| `event_type` | varchar(20) | `CREATE`, `UPDATE`, `DELETE` |
| `entity_name` | varchar(100) | Nombre de la entidad (ej. `EmergencyEntity`) |
| `entity_id` | UUID | ID del registro afectado |
| `old_values` | jsonb, nullable | Snapshot previo a la modificación (null en CREATE) |
| `new_values` | jsonb, nullable | Snapshot posterior (null en DELETE) |
| `ip_address` | varchar(45), nullable | IP de origen |
| `created_at` | timestamp | Fecha del evento |

## Estrategia de implementación

**Opción recomendada**: Interceptor de NestJS que se aplica globalmente y detecta operaciones POST, PATCH, DELETE para registrar la auditoría. Cada servicio puede también llamar explícitamente a `AuditLogService.log()` para control fino.

```typescript
// audit-log.service.ts
@Injectable()
export class AuditLogService {
  async log(params: {
    userId?: string;
    userRole?: string;
    eventType: 'CREATE' | 'UPDATE' | 'DELETE';
    entityName: string;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    // Persistir en audit_log
  }
}
```

## Criterios de aceptación

1. Toda operación CREATE en endpoints protegidos genera un registro en `audit_log`
2. Toda operación UPDATE genera un registro con `old_values` y `new_values`
3. Toda operación DELETE (soft) genera un registro con `old_values`
4. `user_id` y `user_role` se extraen del request autenticado
5. `ip_address` se extrae del request (`request.ip`)
6. Los logs de auditoría son **inmutables**: no se editan ni se eliminan
7. La auditoría no debe bloquear la operación principal si falla (try/catch con log de error)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `AuditLogService.log()` con params válidos | Registro persistido en DB |
| Test unitario | `AuditLogService.log()` con `old_values` y `new_values` | JSONB persistido correctamente |
| Test de integración | Crear emergencia → verificar `audit_log` | Registro con `event_type = 'CREATE'`, `entity_name = 'EmergencyEntity'` |
| Test de integración | Actualizar emergencia → verificar `audit_log` | Registro con `old_values` y `new_values` correctos |
| Test de integración | Soft delete emergencia → verificar `audit_log` | Registro con `event_type = 'DELETE'` |
