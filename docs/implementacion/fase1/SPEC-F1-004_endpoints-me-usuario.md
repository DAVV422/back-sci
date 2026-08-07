# SPEC-F1-004: Endpoints `/me` para perfil del usuario logueado

## Regla de referencia

- [plan_implementacion.md §3](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Endpoints `GET /api/user/me` y `PATCH /api/user/me`

## Descripción

Agregar dos endpoints que permitan al usuario autenticado consultar y actualizar su propio perfil sin necesidad de conocer su UUID. Los endpoints extraen el `id` del token JWT vía el decorador `@GetUser('id')`.

## Estado actual

- [user.controller.ts](file:///c:/Proyectos/SCI/back-sci/src/user/controllers/user.controller.ts) no tiene endpoints `/me`.
- Existe el decorador `@GetUser` en `src/auth/decorators/` ya utilizado en `EmergencyController`.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/user/controllers/user.controller.ts` | Agregar `GET /me` y `PATCH /me` antes de las rutas con `:id` para evitar conflictos de matching de rutas |

## Criterios de aceptación

1. `GET /api/user/me` devuelve los datos del usuario autenticado (sin campo `password`)
2. `PATCH /api/user/me` permite actualizar solo campos editables del perfil propio: `name`, `last_name`, `cellphone`, `grade`
3. Requiere solo `AuthGuard` — cualquier rol autenticado puede ver/editar su propio perfil
4. Las rutas `/me` se registran **ANTES** de `/:id` en el controller para evitar que NestJS interprete `me` como un UUID
5. `PATCH /api/user/me` no permite cambiar `role`, `email`, `password` ni `is_active`

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test e2e | Login → `GET /api/user/me` | HTTP 200, datos del usuario logueado sin `password` |
| Test e2e | `PATCH /api/user/me` con `{ name: 'Nuevo' }` | HTTP 200, nombre actualizado |
| Test e2e | `PATCH /api/user/me` con `{ role: 'ADMIN' }` | HTTP 400 o campo ignorado |
| Test e2e | `GET /api/user/me` sin token | HTTP 401 |
