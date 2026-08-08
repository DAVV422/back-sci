# SPEC-F2-001: Entidad `Form201Entity` e Índice Único Parcial

## Regla de referencia

- [plan_implementacion.md §1 (Fase 2) y §2 (Form201)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §7.2 (assertEditable) y §7.4 (campos inmutables)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

El Formulario 201 es el resumen del incidente (Objetivos, Estrategias, Tácticas, Mensaje de Seguridad y Organigrama). Se debe crear la entidad `Form201Entity` garantizando que solo exista un Formulario 201 activo (no eliminado) por emergencia a nivel de base de datos utilizando un índice único parcial.

## Estado actual

- No existen archivos relacionados con `Form201` en el backend.
- Existe la carpeta `src/incident_module/form-201/` pero solo tiene una estructura vacía o parcial de un desarrollo previo no completado. Vamos a declararla y registrarla formalmente.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/incident_module/form-201/entities/form-201.entity.ts` — Definición de la entidad |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/incident_module/form-201/form-201.module.ts` | Registrar la entidad en `TypeOrmModule.forFeature()` |

## Estructura de Datos de la Entidad: `Form201Entity`

Hereda de `BaseEntity` (`id`, `isDeleted`, `createdAt`, `updatedAt`).

| Atributo | Tipo DB | Campo TS | Decoradores TypeORM / Validación | Descripción |
|:---|:---|:---|:---|:---|
| `code` | `varchar(15)` | `code` | `@Column({ name: 'code', type: 'varchar', length: 15, nullable: false })` | Correlativo del formulario (ej. `F201-001`) |
| `date` | `date` | `date` | `@Column({ name: 'date', type: 'date', nullable: false })` | Fecha del formulario |
| `nature` | `varchar(150)` | `nature` | `@Column({ name: 'nature', type: 'varchar', length: 150, nullable: false })` | Naturaleza del incidente |
| `thread` | `text` | `thread` | `@Column({ name: 'thread', type: 'text', nullable: false })` | Amenaza(s) asociada(s) |
| `affected_area` | `varchar(255)` | `affectedArea` | `@Column({ name: 'affected_area', type: 'varchar', length: 255, nullable: false })` | Descripción del área afectada |
| `communications_channel` | `varchar(100)` | `communicationsChannel` | `@Column({ name: 'communications_channel', type: 'varchar', length: 100, nullable: false })` | Frecuencia o canal de comunicación |
| `entry_route` | `varchar(255)` | `entryRoute` | `@Column({ name: 'entry_route', type: 'varchar', length: 255, nullable: false })` | Ruta de acceso de recursos |
| `egress_route` | `varchar(255)` | `egressRoute` | `@Column({ name: 'egress_route', type: 'varchar', length: 255, nullable: false })` | Ruta de evacuación |
| `affected_areas_map_url` | `varchar(500)` | `affectedAreasMapUrl` | `@Column({ name: 'affected_areas_map_url', type: 'varchar', length: 500, nullable: true })` | URL del mapa de zonas afectadas |
| `objectives` | `text` | `objectives` | `@Column({ name: 'objectives', type: 'text', nullable: false })` | Objetivos |
| `strategies` | `text` | `strategies` | `@Column({ name: 'strategies', type: 'text', nullable: false })` | Estrategias |
| `tactics` | `text` | `tactics` | `@Column({ name: 'tactics', type: 'text', nullable: false })` | Tácticas |
| `safety_message` | `varchar(500)` | `safetyMessage` | `@Column({ name: 'safety_message', type: 'varchar', length: 500, nullable: false })` | Mensaje de seguridad general |
| `organization_chart` | `jsonb` | `organizationChart` | `@Column({ name: 'organization_chart', type: 'jsonb', nullable: false })` | Snapshot inmutable de cargos SCI y personal |
| `is_finalized` | `boolean` | `isFinalized` | `@Column({ name: 'is_finalized', type: 'boolean', default: false })` | Estado del formulario |
| `client_generated_id` | `uuid` | `clientGeneratedId` | `@Column({ name: 'client_generated_id', type: 'uuid', unique: true, nullable: true })` | Clave de deduplicación para offline |

### Relaciones

- `@ManyToOne(() => EmergencyEntity)` con `@JoinColumn({ name: 'emergency_id' })` — Emergencia asociada (obligatoria, onDelete: 'CASCADE').
- `@ManyToOne(() => UserEntity)` con `@JoinColumn({ name: 'user_id' })` — Operador que creó/editó el formulario.

### Índice Único Parcial (Constraint SQL)

Se debe decorar la clase de la entidad con el siguiente índice para evitar múltiples formularios 201 activos sobre la misma emergencia (excluyendo los que están eliminados lógicamente):

```typescript
@Index('uq_form201_active_per_emergency', ['emergency'], {
  unique: true,
  where: `is_deleted = false`,
})
```

## Criterios de Aceptación

1. La entidad `Form201Entity` extiende de `BaseEntity`.
2. Todos los campos obligatorios están definidos con sus tipos y decoradores correctos en TypeORM.
3. Se restringe a un solo registro de `Form201Entity` activo (`isDeleted = false`) por cada emergencia. Si se intenta insertar un segundo formulario no-borrado para la misma emergencia, PostgreSQL lanzará un error de clave duplicada (`23505`).
4. Si un formulario es eliminado mediante soft-delete (`isDeleted = true`), el slot se libera y permite la creación de un nuevo formulario para la misma emergencia.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test de Integración | Crear un Form201 para una emergencia, luego intentar crear un segundo Form201 activo | Segundo intento falla con violación de restricción única (`uq_form201_active_per_emergency`) |
| Test de Integración | Crear un Form201, aplicarle soft delete (`isDeleted = true`), e intentar crear otro Form201 activo | Permite la inserción del segundo Form201 sin errores |
