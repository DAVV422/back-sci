# SPEC-F1-013: Campo `system_name` en `ChargeEntity`

## Regla de referencia

- [plan_implementacion.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Campo `system_name` (varchar(100), nullable)
- [reglas_implementacion.md §2.1](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — CI identificado por `system_name: 'incident_commander'`

## Descripción

La entidad `ChargeEntity` necesita un campo `system_name` que permita identificar programáticamente el cargo de "Comandante del Incidente" sin depender del nombre legible del cargo. Este campo es clave para la lógica de traspaso de comando y unicidad del CI activo.

## Estado actual

- [charges.entity.ts](file:///c:/Proyectos/SCI/back-sci/src/sci_module/charges/entities/charges.entity.ts) no tiene campo `system_name`.
- El seeder crea cargos solo con `name`, `level` y `weight`.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/sci_module/charges/entities/charges.entity.ts` | Agregar columna `system_name` (varchar(100), nullable) |
| [MODIFY] | `src/seeder/seed.service.ts` | Incluir `system_name` en los datos de carga de cargos SCI |
| [MODIFY] | DTOs de `charge` si existen | Agregar campo `system_name` como opcional |

## Valores de `system_name` por cargo

| Cargo (name) | system_name |
|:---|:---|
| Comandante del Incidente | `incident_commander` |
| Jefe de Operaciones | `operations_chief` |
| Jefe de Planificación | `planning_chief` |
| Jefe de Logística | `logistics_chief` |
| Jefe de Administración y Finanzas | `admin_finance_chief` |
| Otros cargos | `null` o valor descriptivo según necesidad |

## Criterios de aceptación

1. `ChargeEntity` tiene el campo `system_name` persistido en la base de datos
2. El cargo "Comandante del Incidente" tiene `system_name = 'incident_commander'`
3. El seeder actualiza los registros existentes (o los crea) con `system_name` apropiado
4. El campo es nullable para cargos que no requieren identificación programática
5. El valor de `system_name` es único entre los registros que lo tienen (no puede haber dos cargos con `system_name = 'incident_commander'`)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Seeder asigna `system_name` al cargo CI | Cargo con `system_name = 'incident_commander'` |
| Test de integración | `ChargeEntity.find({ where: { system_name: 'incident_commander' } })` | Exactamente 1 resultado |
| Test unitario | No hay dos cargos con el mismo `system_name` no-null | Constraint de unicidad respetado |
