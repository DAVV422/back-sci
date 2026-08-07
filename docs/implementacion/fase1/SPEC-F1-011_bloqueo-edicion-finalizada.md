# SPEC-F1-011: Bloqueo de edición en emergencia Finalizada

## Regla de referencia

- [reglas_implementacion.md §2.3](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Bloqueo en estado Finalizada

## Descripción

Una emergencia en estado `'f'` (Finalizada) no permite edición de sus datos ni de sus recursos asociados (salvo devolución de recursos, que es logística). Si se requieren correcciones, el administrador debe reabrir la emergencia (ver SPEC-F1-010).

## Estado actual

- Ningún servicio valida el estado de la emergencia antes de realizar operaciones de escritura.
- [emergency.service.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/services/emergency.service.ts) `update()` permite modificar cualquier campo sin importar el estado.
- [resource.service.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/resource/services/resource.service.ts) `create()` no verifica estado de la emergencia.
- [action.service.ts](file:///c:/Proyectos/SCI/back-sci/src/incident_module/action/services/action.service.ts) `create()` no verifica estado de la emergencia.
- [attends.service.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/attends/services/attends.service.ts) `create()` no verifica estado de la emergencia.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/emergency/services/emergency.service.ts` | Verificar `state !== 'f'` y `state !== 'c'` antes de `update()` |
| [MODIFY] | `src/organization_module/resource/services/resource.service.ts` | Verificar estado de emergencia antes de `create()` y `update()` |
| [MODIFY] | `src/incident_module/action/services/action.service.ts` | Verificar estado de emergencia antes de `create()` |
| [MODIFY] | `src/organization_module/attends/services/attends.service.ts` | Verificar estado de emergencia antes de `create()` y `delete()` |

## Helper sugerido

Crear un método reutilizable para validar que la emergencia es editable:

```typescript
// En EmergencyService o como utility
public assertEditable(emergency: EmergencyEntity): void {
  if (emergency.state === EmergencyStatus.Finished) {
    throw new BadRequestException(
      'La emergencia está finalizada. No se permiten ediciones. Solicite reapertura a un administrador.'
    );
  }
  if (emergency.state === EmergencyStatus.Canceled) {
    throw new BadRequestException(
      'La emergencia está cancelada. No se permiten ediciones.'
    );
  }
}
```

## Criterios de aceptación

1. `PATCH /api/emergency/:id` con emergencia finalizada → `BadRequestException`
2. `PATCH /api/emergency/:id` con emergencia cancelada → `BadRequestException`
3. `POST /api/resource` con emergencia finalizada → `BadRequestException`
4. `POST /api/action` con emergencia finalizada → `BadRequestException`
5. `POST /api/attend` con emergencia finalizada → `BadRequestException`
6. **Excepción explícita**: `PATCH /api/resource/:id/return` (devolución de recursos) **SÍ se permite** en emergencia finalizada — es logística, no edición operativa (ver [flujos_del_sistema_v2.md §3.2 Nota](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md))
7. Tras reabrir la emergencia como ADMIN (`f → a`), la edición vuelve a permitirse

## Dependencia con otras specs

- **Requiere SPEC-F1-010** (máquina de estados, para que exista la transición `f → a` de reapertura)
- **Requiere SPEC-F1-012** (soft delete, para que los servicios no hagan hard delete)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Editar emergencia finalizada | `BadRequestException` |
| Test unitario | Editar emergencia cancelada | `BadRequestException` |
| Test unitario | Crear recurso para emergencia finalizada | `BadRequestException` |
| Test unitario | Crear acción para emergencia cancelada | `BadRequestException` |
| Test unitario | Devolver recurso en emergencia finalizada | ✅ Permitido |
| Test de integración | Finalizar → intentar editar → reabrir (ADMIN) → editar exitosamente | Flujo completo verificado |
| Test de integración | Intentar modificar recurso en emergencia finalizada → HTTP 400 | Recurso no modificado |
