# SPEC-F1-019: Exclusión del `ADMIN` de listados de usuarios

## Regla de referencia

- [reglas_implementacion.md §2.1](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Privacidad del Administrador

## Descripción

El usuario con rol `ADMIN` (administrador del sistema) debe ser excluido explícitamente de todas las consultas y listados de usuarios de cara a la interfaz, para proteger el acceso prioritario al sistema.

## Estado actual

- [user.service.ts](file:///c:/Proyectos/SCI/back-sci/src/user/services/user.service.ts) L21-33: `findAll()` filtra por `is_deleted = false` pero no excluye al `ADMIN`.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/user/services/user.service.ts` | En `findAll()`, agregar condición `AND role != 'ADMIN'` |

## Implementación

```typescript
// user.service.ts — findAll()
query.andWhere('user.role != :adminRole', { adminRole: ROLES.ADMIN });
```

## Criterios de aceptación

1. `GET /api/user` no incluye usuarios con rol `ADMIN` en los resultados
2. El filtro se aplica **siempre**, independientemente del rol del usuario que hace la consulta
3. El ADMIN sigue siendo accesible vía `findOne(id)` y `findByEmail()` para operaciones internas (login, etc.)
4. La exclusión aplica también cuando se usan filtros de búsqueda (`attr`/`value`)

## Dependencia con otras specs

- **Requiere SPEC-F1-002** (whitelist de QueryDto, para que los filtros de búsqueda no puedan usarse para encontrar al ADMIN)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `findAll()` con un ADMIN en DB | No aparece en resultados |
| Test unitario | `findAll()` con ADMIN y otros usuarios | Solo devuelve los no-ADMIN |
| Test unitario | `findOne(adminId)` | Sí devuelve al ADMIN (acceso directo permitido) |
| Test e2e | Crear ADMIN vía seeder → `GET /api/user` | ADMIN no incluido en la lista |
