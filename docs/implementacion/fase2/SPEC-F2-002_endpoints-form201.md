# SPEC-F2-002: Endpoints de Gestión y Consulta del Formulario 201

## Regla de referencia

- [plan_implementacion.md §3 (Endpoints Fase 2)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §7.1 (ApiResponse), §7.2 (assertEditable), §7.4 (campos inmutables)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

Implementar el controlador, servicio, DTOs y lógica de negocio para la gestión del Formulario 201, aplicando control de estado (bloqueo en finalizada y validación de formulario cerrado) y formateo de API estándar.

## Estado actual

- Existe la estructura básica en `src/incident_module/form-201/` pero sin endpoints ni DTOs funcionales.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/incident_module/form-201/dto/create-form-201.dto.ts` — DTO de creación |
| [NEW] | `src/incident_module/form-201/dto/update-form-201.dto.ts` — DTO de actualización (ignora `is_finalized` y `code`) |
| [NEW] | `src/incident_module/form-201/controllers/form-201.controller.ts` — Controlador expuesto |
| [NEW] | `src/incident_module/form-201/services/form-201.service.ts` — Lógica de negocio |

## Endpoints a Implementar

| Método | Endpoint | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `POST` | `/api/emergency/:emergencyId/form201` | AuthGuard | `BASIC` | Crear F201 para una emergencia |
| `GET` | `/api/emergency/:emergencyId/form201` | AuthGuard | `BASIC` | Obtener F201 activo de la emergencia |
| `PATCH` | `/api/form201/:id` | AuthGuard | `BASIC` | Editar datos de F201 (si no está finalizado) |
| `PATCH` | `/api/form201/:id/finalize` | AuthGuard | `BASIC` | Finalizar (cerrar) Formulario 201 |
| `DELETE` | `/api/form201/:id` | AuthGuard, RolesGuard | `MANAGER` | Soft delete del Formulario 201 |

## Lógica y Validaciones del Servicio

### Creación (`POST`)
1. Verificar que la emergencia existe y no está finalizada/cancelada (`assertEditable`).
2. Validar que no exista un F201 activo (`isDeleted: false`) para la emergencia.
3. Generar el código correlativo de manera segura (ej. `F201-XXX`).
4. Capturar el organigrama actual de la emergencia (snapshot de asignaciones en `AttendEntity`) y serializarlo a `organization_chart` para preservarlo inmutable.
5. Retornar el formulario creado con `ApiResponse<Form201Entity>`.

### Edición (`PATCH /:id`)
1. Validar que el F201 existe.
2. Cargar la emergencia asociada y verificar que es editable (`assertEditable`).
3. Verificar que el formulario no esté finalizado (`is_finalized === false`). Si está finalizado, lanzar `BadRequestException('El formulario ya está finalizado y no se puede editar.')`.
4. Actualizar campos permitidos (ignorar `code`, `is_finalized` y `client_generated_id` si se envían).

### Finalización (`PATCH /:id/finalize`)
1. Cambiar el flag `is_finalized` a `true`.
2. Registrar un `ActionEntity` en la bitácora de la emergencia: `'Formulario 201 finalizado'`.

### Eliminación (`DELETE /:id`)
1. Validar `assertEditable()` sobre la emergencia.
2. Hacer soft-delete (`isDeleted = true`).

## Criterios de Aceptación

1. Los endpoints están debidamente protegidos por `AuthGuard` y `RolesGuard` según la tabla de accesos.
2. Se formatea la respuesta con la estructura `ApiResponse<T>`.
3. No se permite editar un formulario si está finalizado (`is_finalized: true`).
4. Al eliminar un F201, se puede volver a crear uno nuevo para la misma emergencia.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test Unitario | Intentar editar un F201 finalizado | Lanza `BadRequestException` |
| Test Unitario | Crear F201 con la emergencia finalizada o cancelada | Lanza `BadRequestException` |
| Test e2e | Flujo: Crear F201 → Editar → Finalizar → Intentar editar de nuevo | Falla en el último paso con HTTP 400 |
