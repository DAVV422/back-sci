# SPEC-F2-010: Endpoint de Sincronización por Lotes y Resolución de Conflictos

## Regla de referencia

- [plan_implementacion.md §2 (Offline) y §3 (Sync Batch)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §7.2 (assertEditable) y §7.3 (Transacciones)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

El dispositivo móvil acumula un lote de operaciones (ej. "crear víctima", "crear F207", "registrar triage") en cola y las envía de golpe al recuperar conectividad. Se debe implementar el endpoint `/api/sync/batch` para procesar este lote de operaciones de forma ordenada y transaccional, controlando las condiciones de cierre de emergencias (conflictos).

## Estado actual

- No existen endpoints ni servicios de sincronización en la aplicación.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/common/dto/sync-batch.dto.ts` — DTO del payload de sincronización |
| [NEW] | `src/common/controllers/sync.controller.ts` — Controlador expuesto |
| [NEW] | `src/common/services/sync.service.ts` — Procesador de sincronización |

## Estructura del DTO: `SyncBatchDto`

```typescript
export interface SyncOperation {
  entity: 'form201' | 'form207' | 'victim' | 'registration';
  action: 'create' | 'update';
  clientGeneratedId: string;
  emergencyId?: string; // Requerido para validar cierres
  payload: any;
}

export class SyncBatchDto {
  operations: SyncOperation[];
}
```

## Lógica del Procesador de Sincronización

1. **Secuencialidad**: Las operaciones se procesan en el orden estricto en que vienen en el arreglo (cronológico).
2. **Transaccionalidad individual con Try/Catch**: Si una operación del lote falla, no se debe hacer rollback de todo el lote completo (para no perder el trabajo offline válido del usuario). Cada operación corre dentro de su propio bloque de transacción/ejecución.
3. **Resolución de Conflictos (`SYNC_CONFLICT_EMERGENCY_CLOSED`)**:
   - Antes de aplicar una operación, verificar si la emergencia relacionada está `Finalizada` o `Cancelada`.
   - Si la emergencia está cerrada:
     1. Omitir la operación (no persistir en DB).
     2. Generar una notificación al usuario de tipo `sync_conflict` con el mensaje: `'No se pudo sincronizar la operación de {entidad} debido a que la emergencia {codigo} ya se encuentra cerrada.'`.
     3. Incluir en la respuesta del lote el estado de conflicto de esa operación con el código de error `'SYNC_CONFLICT_EMERGENCY_CLOSED'`.
4. **Idempotencia**: Si la operación ya fue guardada previamente (se valida vía `client_generated_id` de SPEC-F2-009), se omite el guardado y se marca como exitosa.

## Endpoint

| Método | Endpoint | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `POST` | `/api/sync/batch` | AuthGuard | `BASIC` | Sincronizar cola de operaciones offline del dispositivo |

### Respuesta Esperada

El endpoint responde con un estatus individual de cada operación procesada:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "results": [
      { "clientGeneratedId": "uuid-1", "status": "success", "serverId": "uuid-db" },
      { "clientGeneratedId": "uuid-2", "status": "conflict", "error": "SYNC_CONFLICT_EMERGENCY_CLOSED" },
      { "clientGeneratedId": "uuid-3", "status": "success" }
    ]
  }
}
```

## Criterios de Aceptación

1. El endpoint procesa lotes de múltiples operaciones y devuelve el estatus detallado de cada una.
2. Si la emergencia está cerrada, la operación correspondiente no se persiste y se genera una notificación de conflicto en base de datos.
3. Los reintentos del mismo lote responden con éxito de forma transparente (idempotente).

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test de Integración | Enviar lote con operaciones sobre emergencia abierta | Todas se sincronizan con estado `'success'` |
| Test de Integración | Enviar lote con una operación sobre emergencia finalizada | Esa operación específica devuelve `'conflict'` y genera una alerta/notificación; el resto del lote se procesa si aplica |
