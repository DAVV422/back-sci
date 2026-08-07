# SPEC-F1-018: Guards faltantes en `AttendController`

## Regla de referencia

- [plan_implementacion.md §3](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Attend: AuthGuard + RolesGuard, rol mínimo `MANAGER`/`ADMIN`

## Descripción

`AttendController` no tiene `@UseGuards(AuthGuard, RolesGuard)` a nivel de clase, exponiendo los endpoints de asignación de personal sin protección. Además, falta el endpoint `PATCH /api/attend/:id` para actualizar el cargo asignado.

## Estado actual

- [attends.controller.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/attends/controllers/attends.controller.ts) no tiene decoradores de guards ni de roles.
- No existe endpoint `PATCH` para actualizar asignaciones.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/attends/controllers/attends.controller.ts` | Agregar `@UseGuards(AuthGuard, RolesGuard)` a nivel de clase; agregar `@RolesAccess` por endpoint; agregar `PATCH /:id` |
| [MODIFY] | `src/organization_module/attends/services/attends.service.ts` | Agregar método `update()` para cambiar cargo |

## Configuración de acceso por endpoint

| Método | Ruta | Rol Mínimo | Notas |
|:---:|:---|:---:|:---|
| `POST` | `/api/attend` | `MANAGER` | Asignar personal y cargo SCI |
| `PATCH` | `/api/attend/:id` | `MANAGER` | Actualizar cargo del personal asignado |
| `DELETE` | `/api/attend/:id` | `MANAGER` | Retirar personal asignado |
| `GET` | `/api/attend/:id` | `BASIC` | Consultar asignación específica |
| `GET` | `/api/attend/emergency/:emergencyId` | `BASIC` | Listar personal de una emergencia |
| `GET` | `/api/attend/user/:userId` | `BASIC` | Listar emergencias de un usuario |

## Criterios de aceptación

1. Todos los endpoints de `AttendController` están protegidos con `AuthGuard` y `RolesGuard`
2. `POST`, `PATCH`, `DELETE` requieren rol mínimo `MANAGER`
3. `GET` requiere rol mínimo `BASIC`
4. Existe endpoint `PATCH /api/attend/:id` que permite cambiar el cargo asignado (recibe `chargeId` en body)
5. Los imports de guards y decoradores están presentes

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test e2e | Request sin token a `POST /api/attend` | HTTP 401 Unauthorized |
| Test e2e | Request con token `BASIC` a `POST /api/attend` | HTTP 403 Forbidden |
| Test e2e | Request con token `MANAGER` a `POST /api/attend` | HTTP 201 Created |
| Test e2e | `PATCH /api/attend/:id` con nuevo `chargeId` | Cargo actualizado correctamente |
| Test e2e | Request sin token a `GET /api/attend/:id` | HTTP 401 |
