# SPEC-F1-009: Entidad `InitialAssessmentEntity` y endpoints de evaluación inicial

## Regla de referencia

- [plan_implementacion.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Tabla `initial_assessment`
- [plan_implementacion.md §3](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Endpoints `POST` y `PATCH /api/emergency/:id/assessment`
- [flujos_del_sistema_v2.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md) — Flujo de evaluación inicial

## Descripción

Crear la entidad `InitialAssessmentEntity`, sus DTOs, servicio y controller para registrar la evaluación preliminar de riesgos de un incidente. Solo se permite una evaluación inicial por emergencia.

## Estado actual

- No existe ningún archivo relacionado con `InitialAssessment` en el proyecto.
- [emergency.entity.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/entities/emergency.entity.ts) no tiene relación con evaluación inicial.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/organization_module/emergency/entities/initial-assessment.entity.ts` |
| [NEW] | `src/organization_module/emergency/dto/create-initial-assessment.dto.ts` |
| [NEW] | `src/organization_module/emergency/dto/update-initial-assessment.dto.ts` |
| [NEW] | `src/organization_module/emergency/services/initial-assessment.service.ts` |
| [NEW] | `src/organization_module/emergency/controllers/initial-assessment.controller.ts` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/emergency/emergency.module.ts` | Registrar nueva entidad, servicio y controller |

## Modelo de datos: `InitialAssessmentEntity`

Hereda de `BaseEntity` (`id`, `createdAt`, `updatedAt`, `isDeleted`).

| Campo | Tipo | Notas |
|:---|:---|:---|
| `hazard_type` | varchar(100) | Tipo de peligro identificado. `@IsNotEmpty()` |
| `severity_level` | varchar(20) | `Bajo`, `Medio`, `Alto`, `Extremo`. Validar con `@IsEnum()` |
| `affected_people_estimated` | int | Estimación inicial de personas afectadas. `@IsPositive()` |
| `situation_description` | text | Descripción detallada de la situación. `@IsNotEmpty()` |
| `weather_conditions` | varchar(100) | Condiciones clima (viento, lluvia, visibilidad). `@IsOptional()` |

**Relación**: `@OneToOne(() => EmergencyEntity)` con `@JoinColumn()` en el lado de `EmergencyEntity`.

## Endpoints

| Método | Ruta | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `POST` | `/api/emergency/:id/assessment` | AuthGuard | `BASIC` | Crear evaluación inicial |
| `PATCH` | `/api/emergency/:id/assessment` | AuthGuard | `BASIC` | Modificar evaluación inicial |

## Criterios de aceptación

1. Solo se permite **una** evaluación inicial por emergencia
2. Si ya existe una evaluación para la emergencia, `POST` devuelve `BadRequestException('Ya existe una evaluación inicial para esta emergencia. Use PATCH para modificarla.')`
3. El DTO valida que `severity_level` esté en `['Bajo', 'Medio', 'Alto', 'Extremo']`
4. La creación de la evaluación registra una `ActionEntity` automática con descripción: `'Evaluación Inicial registrada'`
5. La emergencia debe existir y no estar en estado `Cancelada` ni `Finalizada` para registrar/modificar evaluación
6. El controller está protegido con `@UseGuards(AuthGuard, RolesGuard)`

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Crear evaluación con datos válidos | Entidad persistida correctamente |
| Test unitario | Crear segunda evaluación para misma emergencia | `BadRequestException` |
| Test unitario | Crear evaluación con `severity_level: 'Crítico'` (inválido) | Validation error |
| Test unitario | Crear evaluación para emergencia cancelada | `BadRequestException` |
| Test e2e | `POST /api/emergency/:id/assessment` | HTTP 201 con datos de evaluación |
| Test e2e | `PATCH /api/emergency/:id/assessment` | HTTP 200 con datos actualizados |
