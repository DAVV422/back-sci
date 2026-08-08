# SPEC-F1-010: Máquina de Estados de la Emergencia (`EmergencyStateMachine`)

## Regla de referencia

- [reglas_implementacion.md §2.3](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Tabla de transiciones y reglas asociadas
- [flujos_del_sistema_v2.md §5](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md) — Máquina de estados

## Descripción

Implementar una máquina de estados explícita que gobierne las transiciones del estado de la emergencia, en lugar de permitir cualquier cambio libre vía `UpdateEmergencyDto`. Debe implementarse como un **mapa de transiciones permitidas**, no como una cadena de `if/else`.

## Estado actual

- [emergency.service.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/services/emergency.service.ts) `update()` acepta cualquier cambio de estado sin validación.
- [update-emergency.dto.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/dto/update-emergency.dto.ts) permite enviar cualquier `state` vía `PartialType(CreateEmergencyDto)`.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/organization_module/emergency/services/emergency-state-machine.ts` — Mapa de transiciones permitidas con validaciones por transición |
| [NEW] | `src/organization_module/emergency/dto/change-emergency-state.dto.ts` — DTO dedicado con `state` y `cancellation_reason?` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/emergency/services/emergency.service.ts` | Separar la lógica de cambio de estado del `update()` general; usar `EmergencyStateMachine` |
| [MODIFY] | `src/organization_module/emergency/controllers/emergency.controller.ts` | Crear endpoint dedicado `PATCH /api/emergency/:id/state` para transiciones |
| [MODIFY] | `src/organization_module/emergency/dto/update-emergency.dto.ts` | Excluir `state` del DTO de actualización general |

## Tabla de transiciones

| Desde \ Hacia | Pendiente (p) | Activa (a) | Finalizada (f) | Cancelada (c) |
|:---|:---:|:---:|:---:|:---:|
| **Pendiente (p)** | — | ✅ | ❌ | ✅ |
| **Activa (a)** | ❌ | — | ✅ (con validación) | ✅ |
| **Finalizada (f)** | ❌ | ✅ (solo MANAGER) | — | ❌ |
| **Cancelada (c)** | ❌ | ❌ | ❌ | — (terminal) |

## Reglas por transición

| Transición | Regla |
|:---|:---|
| `p → a` | Registrar fecha/hora de activación en `ActionEntity` |
| `p → c` | `cancellation_reason` obligatorio; registrar en `ActionEntity` |
| `a → c` | `cancellation_reason` obligatorio; registrar en `ActionEntity` |
| `a → f` | Validar que **todos** los formularios (F201/F207 activos) tengan `is_finalized: true`; si hay pendientes → `BadRequestException` con lista de formularios |
| `f → a` | Solo rol `MANAGER`; registrar reapertura en `ActionEntity` |
| Cualquier otra | `BadRequestException` con mensaje: `"Transición de '{from}' a '{to}' no permitida. Transiciones válidas desde '{from}': [...]"` |

## Diseño recomendado

```typescript
// emergency-state-machine.ts
const TRANSITIONS: Record<EmergencyStatus, EmergencyStatus[]> = {
  [EmergencyStatus.Pending]:  [EmergencyStatus.Active, EmergencyStatus.Canceled],
  [EmergencyStatus.Active]:   [EmergencyStatus.Finished, EmergencyStatus.Canceled],
  [EmergencyStatus.Finished]: [EmergencyStatus.Active],  // solo MANAGER
  [EmergencyStatus.Canceled]: [],                         // terminal
};
```

## Criterios de aceptación

1. `p → a`: registra acción de activación con fecha/hora
2. `p → c` y `a → c`: requiere `cancellation_reason` obligatorio; se registra en `ActionEntity`
3. `a → f`: valida formularios finalizados; si hay pendientes → `BadRequestException` con lista
4. `f → a`: solo `ADMIN`; se registra reapertura con usuario y hora
5. `c → *`: rechazado con mensaje indicando que es estado terminal
6. Transiciones no listadas: rechazadas con `BadRequestException` indicando transiciones válidas desde el estado actual
7. El cambio de estado tiene su propio endpoint (`PATCH /api/emergency/:id/state`), separado del `PATCH /api/emergency/:id` general
8. El `PATCH /api/emergency/:id` general **no puede** cambiar el campo `state`

## Dependencia con otras specs

- **Requiere SPEC-F1-008** (default `'p'` y estructura de estados)
- **Requiere SPEC-F1-009** (`InitialAssessmentEntity` para validación `a → f`)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `p → a` | ✅ Transición exitosa + `ActionEntity` creada |
| Test unitario | `p → f` | ❌ `BadRequestException` |
| Test unitario | `p → c` sin motivo | ❌ Validation error (motivo obligatorio) |
| Test unitario | `p → c` con motivo | ✅ Transición exitosa + `ActionEntity` con motivo |
| Test unitario | `a → f` con formularios sin finalizar | ❌ `BadRequestException` con lista |
| Test unitario | `a → f` con formularios finalizados | ✅ Transición exitosa |
| Test unitario | `a → c` con motivo | ✅ Transición exitosa |
| Test unitario | `f → a` con rol ADMIN | ✅ Transición exitosa |
| Test unitario | `f → a` con rol BASIC | ❌ `UnauthorizedException` o `ForbiddenException` |
| Test unitario | `f → c` | ❌ `BadRequestException` |
| Test unitario | `c → a` | ❌ `BadRequestException` (terminal) |
| Test unitario | `c → f` | ❌ `BadRequestException` (terminal) |
| Test de integración | Ciclo `p → a → f → a (ADMIN) → f` | Verificar `ActionEntity` correcta en cada paso |
