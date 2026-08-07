# SPEC-F1-020: Seeder de producción con variables de entorno

## Regla de referencia

- [tareas_y_estado.md §1](file:///c:/Proyectos/SCI/back-sci/docs/checklist/tareas_y_estado.md) — Seeder para producción con variables de entorno

## Descripción

El seeder actual crea datos hardcodeados. Debe consumir variables de entorno para crear el usuario administrador inicial de forma segura en producción, sin exponer credenciales en el código fuente.

## Estado actual

- [seed.service.ts](file:///c:/Proyectos/SCI/back-sci/src/seeder/seed.service.ts) contiene credenciales hardcodeadas para el usuario admin.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/seeder/seed.service.ts` | Leer `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `ADMIN_LAST_NAME` de `process.env` vía `ConfigService` |
| [MODIFY] | `.env.example` | Documentar las nuevas variables de entorno |

## Variables de entorno nuevas

```env
# .env.example
ADMIN_EMAIL=admin@sci.local
ADMIN_PASSWORD=change_me_on_production
ADMIN_NAME=Administrador
ADMIN_LAST_NAME=Sistema
```

## Criterios de aceptación

1. El seeder crea el usuario admin solo si **no existe previamente** (buscar por email)
2. Las credenciales del admin se leen de `process.env` (via `ConfigService`)
3. Si las variables de entorno requeridas no están definidas, el seeder lanza un error claro: `'Variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD son requeridas para el seeder'`
4. El password se hashea con bcrypt antes de persistir (misma lógica que `UserService.createUser()`)
5. Los cargos SCI se siguen cargando normalmente (hardcodeados es aceptable para datos de catálogo)
6. El seeder es **idempotente**: ejecutarlo dos veces no duplica datos

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Seeder con variables de entorno definidas | Crea usuario admin |
| Test unitario | Seeder sin variables de entorno | Lanza error descriptivo |
| Test unitario | Seeder con admin ya existente | No duplica, no falla |
| Test unitario | Password del admin creado | Hasheado con bcrypt, no texto plano |
