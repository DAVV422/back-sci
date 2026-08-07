# SPEC-F1-008: Default de `state` a `'p'` (Pendiente) y relación con evaluación inicial

## Regla de referencia

- [plan_implementacion.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — `state` default `'p'`
- [flujos_del_sistema_v2.md §2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md) — Emergencia nace en estado pendiente

## Descripción

Actualmente `EmergencyEntity.state` tiene default `'a'` (Activa). Según la especificación, una emergencia nace en estado `'p'` (Pendiente) y transiciona a `'a'` explícitamente tras la evaluación inicial. Además, se debe establecer la relación OneToOne con `InitialAssessmentEntity`.

## Estado actual

- [emergency.entity.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/entities/emergency.entity.ts) L53: `default: 'a'` — incorrecto según especificación.
- [create-emergency.dto.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/dto/create-emergency.dto.ts) L83: `state` es un campo requerido (`@IsNotEmpty()`) enviado por el cliente — debería asignarse automáticamente.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/emergency/entities/emergency.entity.ts` | Cambiar default de `state` a `'p'`; agregar relación `@OneToOne` con `InitialAssessmentEntity`; agregar `initial_assessment_id` FK |
| [MODIFY] | `src/organization_module/emergency/dto/create-emergency.dto.ts` | Eliminar campo `state` del DTO (se asigna automáticamente como `'p'`); eliminar `@IsEnum(EmergencyStatus)` |
| [MODIFY] | `src/organization_module/emergency/services/emergency.service.ts` | Asignar `state: EmergencyStatus.Pending` forzosamente en `create()` |

## Criterios de aceptación

1. Una emergencia creada siempre tiene `state = 'p'` (Pendiente), independientemente de lo que envíe el cliente
2. El campo `state` **no** aparece en `CreateEmergencyDto`
3. La entidad tiene relación `@OneToOne` con `InitialAssessmentEntity` (creada en SPEC-F1-009)
4. El campo `initial_assessment_id` es nullable (la evaluación se registra después de la creación)

## Dependencia con otras specs

- **Requiere SPEC-F1-009** para la relación con `InitialAssessmentEntity` (pueden implementarse juntas)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `EmergencyService.create()` sin campo `state` | Entidad creada con `state === 'p'` |
| Test unitario | `EmergencyService.create()` incluso si DTO tiene `state: 'a'` | Se ignora y se asigna `'p'` |
| Test e2e | `POST /api/emergency` sin campo `state` | HTTP 201 con `state: 'p'` |
