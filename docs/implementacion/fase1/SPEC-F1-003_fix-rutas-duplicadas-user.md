# SPEC-F1-003: Fix BUG-001 — Rutas duplicadas en `UserController`

## Regla de referencia

- [tareas_y_estado.md BUG-001](file:///c:/Proyectos/SCI/back-sci/docs/checklist/tareas_y_estado.md) — Rutas duplicadas `deactivate`/`activate`
- [plan_implementacion.md §3](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Endpoint `PATCH /api/user/status/:id`

## Descripción

Los métodos `deactivate()` y `activate()` en `UserController` comparten la misma ruta `@Get('/deactivate/:id')`, lo que impide activar usuarios. Además, la especificación define un único endpoint `PATCH /api/user/status/:id` con un body `{ is_active: boolean }` para unificar ambas acciones.

## Estado actual

- [user.controller.ts](file:///c:/Proyectos/SCI/back-sci/src/user/controllers/user.controller.ts) L66-76: ambos métodos decorados con `@Get('/deactivate/:id')`.
- Además, usar `@Get` para una operación que muta estado viola las convenciones REST.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/user/dto/update-user-status.dto.ts` — DTO con `is_active: boolean` validado con `@IsBoolean()` y `@IsNotEmpty()` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/user/controllers/user.controller.ts` | Eliminar `deactivate()` y `activate()`; agregar `PATCH /status/:id` con el nuevo DTO |

## Criterios de aceptación

1. `PATCH /api/user/status/:id` con `{ is_active: false }` desactiva al usuario
2. `PATCH /api/user/status/:id` con `{ is_active: true }` activa al usuario
3. Requiere rol mínimo `MANAGER` (decorador `@RolesAccess(ROLES.MANAGER)`)
4. No existen rutas duplicadas en el controller
5. El endpoint usa método HTTP `PATCH`, no `GET`
6. Se devuelve `ApiResponse` con el usuario actualizado

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `UserService.update()` cambia `is_active` a `false` | Usuario con `is_active: false` |
| Test unitario | `UserService.update()` cambia `is_active` a `true` | Usuario con `is_active: true` |
| Test e2e | `PATCH /api/user/status/:id` con `{ is_active: false }` | HTTP 200, usuario desactivado |
| Test e2e | `PATCH /api/user/status/:id` con `{ is_active: true }` | HTTP 200, usuario activado |
| Test e2e | `PATCH /api/user/status/:id` con token `BASIC` | HTTP 403 Forbidden |
