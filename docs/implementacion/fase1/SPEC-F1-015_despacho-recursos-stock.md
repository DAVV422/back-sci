# SPEC-F1-015: Lógica de despacho de recursos (restar stock de `availableQuantity`)

## Regla de referencia

- [flujos_del_sistema_v2.md §3.1](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md) — Despacho de recursos con validación de stock

## Descripción

Actualmente `ResourceService.create()` crea un `ResourceEntity` pero **no resta** la cantidad despachada del inventario disponible en `EquipmentEntity.availableQuantity`. Debe implementarse la validación de stock y la actualización atómica del inventario.

## Estado actual

- [resource.service.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/resource/services/resource.service.ts) L34-50: `create()` simplemente crea el recurso sin modificar el equipo.
- No hay validación de `amount <= availableQuantity`.
- No se registra `ActionEntity` al despachar.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/organization_module/resource/services/resource.service.ts` | En `create()`: validar stock, restar `availableQuantity`, registrar `ActionEntity`, usar transacción |

## Flujo esperado

```
1. Recibir { emergencyId, equipmentId, amount, note }
2. Buscar EquipmentEntity
3. Validar amount <= equipment.availableQuantity
   - Si NO: BadRequestException('Cantidad no disponible en inventario')
4. BEGIN TRANSACTION
   4a. equipment.availableQuantity -= amount
   4b. Guardar EquipmentEntity actualizado
   4c. Crear ResourceEntity
   4d. Crear ActionEntity: 'Despacho de recurso: {equipment.name} x{amount}'
5. COMMIT
6. Retornar ResourceEntity creado
```

## Criterios de aceptación

1. Al despachar recurso: `equipment.availableQuantity -= resource.amount`
2. Si `amount > availableQuantity` → `BadRequestException('Cantidad no disponible en inventario')`
3. Si `amount <= 0` → Validation error (DTO ya debe tener `@IsPositive()`)
4. Se registra `ActionEntity` con descripción: `'Despacho de recurso: {equipment.name} x{amount}'`
5. La operación es atómica (transacción con `QueryRunner` para evitar race conditions en el stock)
6. El `availableQuantity` nunca queda negativo

## Dependencia con otras specs

- **Requiere SPEC-F1-011** (bloqueo de edición — no permitir despacho a emergencia finalizada)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Despachar 5 de equipo con 10 disponibles | `availableQuantity = 5`, `ResourceEntity` creada |
| Test unitario | Despachar 15 de equipo con 10 disponibles | `BadRequestException` |
| Test unitario | Despachar 0 unidades | Validation error |
| Test unitario | Verificar que se crea `ActionEntity` | Acción con descripción de despacho |
| Test de integración | Dos despachos concurrentes que suman más que el stock | Solo uno tiene éxito, el otro falla |
