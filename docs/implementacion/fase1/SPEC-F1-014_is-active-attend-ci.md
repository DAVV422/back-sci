# SPEC-F1-014: Campo `is_active` en `AttendEntity` e índice único parcial para CI

## Regla de referencia

- [reglas_implementacion.md §2.1](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Control de unicidad del CI activo, índice único parcial
- [plan_implementacion.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Tabla `attend`

## Descripción

`AttendEntity` necesita un campo `is_active` para gestionar asignaciones activas vs. históricas (ej. traspasos de comando). Además, se debe crear un índice único parcial en PostgreSQL que garantice que solo exista **un Comandante del Incidente activo** por emergencia.

## Estado actual

- [attends.entity.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/attends/entities/attends.entity.ts) no tiene campo `is_active`.
- [attends.service.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/attends/services/attends.service.ts) no valida unicidad de CI ni captura errores de constraint.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/attends/entities/attends.entity.ts` | Agregar `is_active` (boolean, default true) |
| [MODIFY] | `src/organization_module/attends/services/attends.service.ts` | Validar unicidad de CI al crear; capturar error `23505` → `ConflictException` |

## Índice único parcial

```sql
-- Garantiza un solo CI activo por emergencia a nivel de base de datos
CREATE UNIQUE INDEX uq_attend_incident_commander_active
ON attend (emergency_id)
WHERE charge_id IN (SELECT id FROM charge WHERE system_name = 'incident_commander')
  AND is_active = true;
```

> **Nota**: como el proyecto usa `synchronize: true`, este índice puede crearse vía `@Index` decorador de TypeORM o vía un subscriber/migration manual. Si TypeORM no soporta `WHERE` parcial en `@Index`, usar un script SQL ejecutado por el seeder.

## Lógica en el servicio

```typescript
// attends.service.ts — create()
try {
  // ... crear attend
  await this.attendRepository.save(attend);
} catch (error) {
  if (error.code === '23505') { // Unique constraint violation
    throw new ConflictException('Ya existe un Comandante del Incidente activo para esta emergencia.');
  }
  throw error;
}
```

## Criterios de aceptación

1. `AttendEntity` tiene campo `is_active` con default `true`
2. Solo puede existir un registro con cargo CI (`system_name = 'incident_commander'`) y `is_active = true` por `emergency_id`
3. Si se viola el constraint de unicidad, se devuelve `ConflictException` (HTTP 409) con mensaje claro
4. Al desactivar un attend (`is_active = false`), se permite asignar un nuevo CI
5. Los listados de attends por emergencia incluyen tanto activos como históricos (para trazabilidad), pero diferenciados por el campo `is_active`

## Dependencia con otras specs

- **Requiere SPEC-F1-013** (`system_name` en `ChargeEntity` para identificar el CI)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Crear dos attends con cargo CI para misma emergencia | Segundo falla con `ConflictException` (409) |
| Test unitario | Crear attend con cargo no-CI (ej. Jefe de Operaciones) | Permite múltiples activos |
| Test de integración | Asignar CI → desactivar → asignar nuevo CI | Éxito, ambos en DB (uno con `is_active: false`) |
| Test de integración | Dos requests simultáneas de asignación de CI | Solo una tiene éxito, otra recibe 409 |
