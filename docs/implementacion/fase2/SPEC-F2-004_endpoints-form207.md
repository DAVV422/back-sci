# SPEC-F2-004: Endpoints de Gestión y Consulta del Formulario 207

## Regla de referencia

- [plan_implementacion.md §3 (Endpoints Fase 2)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §7.1 (ApiResponse), §7.2 (assertEditable)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

Implementar el controlador, servicio y DTOs para la gestión de los formularios F207, asegurando el control de accesos y la inmutabilidad de estados.

## Estado actual

- Existe estructura básica de controladores y servicios en `src/victim_registry_module/form-207/` pero carecen de lógica e inyección de guards (ver bug BUG-003 en `tareas_y_estado.md`).

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/victim_registry_module/form-207/dto/create-form-207.dto.ts` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/victim_registry_module/form-207/controllers/form-207.controller.ts` | Agregar `@UseGuards(AuthGuard, RolesGuard)` a nivel de clase; implementar endpoints |
| [MODIFY] | `src/victim_registry_module/form-207/services/form-207.service.ts` | Implementar lógica de creación (transaccional), listado y finalización |

## Endpoints a Implementar

| Método | Endpoint | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `POST` | `/api/emergency/:emergencyId/form207` | AuthGuard, RolesGuard | `BASIC` | Crear un nuevo F207 para la emergencia |
| `GET` | `/api/emergency/:emergencyId/form207` | AuthGuard, RolesGuard | `BASIC` | Listar todos los F207 de la emergencia |
| `PATCH` | `/api/form207/:id/finalize` | AuthGuard, RolesGuard | `BASIC` | Finalizar el Formulario 207 |

## Lógica del Servicio

### Creación (`POST`)
1. Validar `assertEditable()` sobre la emergencia.
2. Usar la transacción e incrementar el contador atómico para obtener el correlativo del código (SPEC-F2-003).
3. Persistir y retornar el formulario.

### Finalización (`PATCH /finalize`)
1. Marcar `is_finalized = true`.
2. Registrar una acción en la bitácora: `'Formulario 207 {codigo} finalizado'`.
3. Emitir evento de notificación (ver SPEC-F2-008).

## Criterios de Aceptación

1. El controlador está protegido por `AuthGuard` y `RolesGuard` (corrige la vulnerabilidad de acceso público de BUG-003).
2. Se retorna `ApiResponse<Form207Entity>` o `ApiResponse<Form207Entity[]>`.
3. No se permite crear un F207 si la emergencia está finalizada o cancelada.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test e2e | Acceder a `GET /api/emergency/:id/form207` sin token | HTTP 401 Unauthorized |
| Test e2e | Crear F207 para una emergencia finalizada | HTTP 400 Bad Request |
| Test e2e | Flujo completo: Crear F207 → Finalizar | HTTP 200 y `is_finalized` cambia a `true` |
