# SPEC-F1-012: Soft Delete global en todas las entidades de Fase 1

## Regla de referencia

- [reglas_implementacion.md §4](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Soft Delete Global
- [reglas_implementacion.md §1](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — `BaseEntity` con atributos comunes incluyendo `isDeleted`

## Descripción

Implementar soft delete (`is_deleted: boolean, default false`) en **todas** las entidades operativas que actualmente usan hard delete (`Repository.delete()`). El campo `is_deleted` debe heredarse de `BaseEntity` para que todas las entidades lo tengan de forma consistente.

## Estado actual

- [base.entity.ts](file:///c:/Proyectos/SCI/back-sci/src/common/entities/base.entity.ts) **no** tiene campo `is_deleted`.
- `UserEntity` ya tiene `is_deleted` como campo propio (no heredado).
- `EmergencyEntity` **no** tiene `is_deleted`. Su `delete()` hace hard delete.
- `EquipmentEntity` **no** tiene `is_deleted`.
- `ResourceEntity` **no** tiene `is_deleted`. Su `delete()` hace hard delete.
- `ActionEntity` **no** tiene `is_deleted`. Su `delete()` hace hard delete.
- `AttendEntity` **no** tiene `is_deleted`. Su `delete()` hace hard delete.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/common/entities/base.entity.ts` | Agregar `is_deleted` (boolean, default false) al `BaseEntity` |
| [MODIFY] | `src/user/entities/user.entity.ts` | Remover `is_deleted` propio (ahora lo hereda de `BaseEntity`) |
| [MODIFY] | `src/organization_module/emergency/services/emergency.service.ts` | Cambiar `delete()` a soft delete; agregar filtro `is_deleted = false` en queries |
| [MODIFY] | `src/organization_module/equipment/services/equipment.service.ts` | Cambiar `delete()` a soft delete; filtrar en queries |
| [MODIFY] | `src/organization_module/resource/services/resource.service.ts` | Cambiar `delete()` a soft delete; filtrar en queries |
| [MODIFY] | `src/incident_module/action/services/action.service.ts` | Cambiar `delete()` a soft delete; filtrar en queries |
| [MODIFY] | `src/organization_module/attends/services/attends.service.ts` | Cambiar `delete()` a soft delete; filtrar en queries |

## Cambio en `BaseEntity`

```typescript
// base.entity.ts — resultado esperado
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
```

## Patrón de soft delete en servicios

```typescript
// Antes (hard delete)
await this.repository.delete(id);

// Después (soft delete)
await this.repository.update(id, { isDeleted: true });

// En queries
query.andWhere('entity.is_deleted = false');
```

## Criterios de aceptación

1. `BaseEntity` contiene `isDeleted` (boolean, default false) heredado por todas las entidades
2. `UserEntity` ya no tiene su propio `is_deleted` — lo hereda de `BaseEntity`
3. `DELETE /api/emergency/:id` marca `is_deleted = true` en vez de borrar físicamente
4. `DELETE /api/equipment/:id` marca `is_deleted = true`
5. `DELETE /api/resource/:id` marca `is_deleted = true`
6. `DELETE /api/action/:id` marca `is_deleted = true`
7. `DELETE /api/attend/:id` marca `is_deleted = true`
8. Los listados (`findAll`, `findByEmergency`, etc.) excluyen registros con `is_deleted = true`
9. No existe ningún `Repository.delete()` físico en servicios de entidades operativas

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `EmergencyService.delete()` | `is_deleted = true`, registro sigue en DB |
| Test unitario | `EquipmentService.delete()` | `is_deleted = true`, registro sigue en DB |
| Test unitario | `ResourceService.delete()` | `is_deleted = true`, registro sigue en DB |
| Test unitario | `ActionService.delete()` | `is_deleted = true`, registro sigue en DB |
| Test unitario | `EmergencyService.findAll()` con registros eliminados | No retorna registros con `is_deleted = true` |
| Test unitario | `ResourceService.findByEmergencyId()` | No retorna recursos soft-deleted |
