# SPEC-F1-016: Endpoint de devolución de recursos (`PATCH /api/resource/:id/return`)

## Regla de referencia

- [plan_implementacion.md §3](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md) — Endpoint `PATCH /api/resource/:id/return`
- [flujos_del_sistema_v2.md §3.2](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md) — Devolución explícita de recursos

## Descripción

Crear un endpoint explícito para devolver recursos al inventario. La devolución **no es automática** al finalizar la emergencia: requiere una acción del operador, ya que el equipo puede quedar en terreno, dañado, o requerir revisión. Se permite incluso con la emergencia en estado Finalizada (es logística, no edición operativa).

## Estado actual

- No existe endpoint de devolución de recursos.
- `ResourceEntity` no tiene campo para rastrear devoluciones parciales.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/organization_module/resource/dto/return-resource.dto.ts` — DTO con `amountReturned: number` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/resource/entities/resource.entity.ts` | Agregar `amount_returned` (int, default 0) |
| [MODIFY] | `src/organization_module/resource/services/resource.service.ts` | Implementar `returnResource(id, amountReturned)` |
| [MODIFY] | `src/organization_module/resource/controllers/resource.controller.ts` | Agregar `PATCH /:id/return` con `@RolesAccess(ROLES.MANAGER)` |

## Endpoint

| Método | Ruta | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `PATCH` | `/api/resource/:id/return` | AuthGuard, RolesGuard | `MANAGER` | Devolver recursos al inventario |

## Flujo esperado

```
1. Recibir { amountReturned }
2. Buscar ResourceEntity con relación a EquipmentEntity
3. Calcular cantidad pendiente: pendiente = resource.amount - resource.amount_returned
4. Validar amountReturned <= pendiente
   - Si NO: BadRequestException('Cantidad a devolver excede lo asignado')
5. BEGIN TRANSACTION
   5a. equipment.availableQuantity += amountReturned
   5b. resource.amount_returned += amountReturned
   5c. Crear ActionEntity: 'Devolución de recurso: {equipment.name} x{amountReturned}'
6. COMMIT
7. Retornar ResourceEntity actualizado
```

## Criterios de aceptación

1. `PATCH /api/resource/:id/return` con `{ amountReturned: N }` suma N a `equipment.availableQuantity`
2. `resource.amount_returned += amountReturned`
3. Si `amountReturned > (amount - amount_returned)` → `BadRequestException('Cantidad a devolver excede lo asignado')`
4. Se registra `ActionEntity` con descripción de la devolución
5. Requiere rol mínimo `MANAGER`
6. **Se permite aunque la emergencia esté Finalizada** (excepción explícita al bloqueo de SPEC-F1-011)
7. La operación es atómica (transacción)
8. `availableQuantity` nunca supera `totalQuantity` del equipo

## Dependencia con otras specs

- **Requiere SPEC-F1-015** (despacho con stock, para que `amount_returned` tenga sentido)
- **Requiere SPEC-F1-011** (para definir la excepción al bloqueo de edición en finalizada)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Devolver 3 de 5 despachadas | `amount_returned = 3`, `availableQuantity += 3` |
| Test unitario | Devolver 6 de 5 despachadas | `BadRequestException` |
| Test unitario | Devolver 3, luego devolver 3 más (total 6 de 5) | Segunda devolución falla |
| Test unitario | Devolver con emergencia finalizada | ✅ Permitido |
| Test unitario | Se registra `ActionEntity` al devolver | Acción con descripción correcta |
