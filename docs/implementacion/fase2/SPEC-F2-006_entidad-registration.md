# SPEC-F2-006: Entidad `RegistrationEntity` (Tabla Intermedia Append-Only inmutable)

## Regla de referencia

- [plan_implementacion.md §1 (Fase 2) y §2 (registration)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §1.1 (BaseEntity - Logs inmutables)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

La entidad `RegistrationEntity` representa la vinculación y el estado clínico de triage de una víctima en un formulario 207 específico. Esta tabla actúa como un log de eventos de triage de carácter **médico-legal e inmutable** (no es editable y no tiene soft delete). Si el estado de la víctima cambia, se añade una nueva fila para mantener el historial de su evolución en el tiempo.

## Estado actual

- Existe el módulo `src/victim_registry_module/registration/` pero requiere estructuración completa para seguir esta regla de inmutabilidad.

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/victim_registry_module/registration/entities/registration.entity.ts` | Definir campos, relaciones y excluir la herencia de `BaseEntity` (ya que es un log inmutable sin `isDeleted` ni `updatedAt`). Definir `id` y `createdAt` directamente. |
| [MODIFY] | `src/victim_registry_module/registration/registration.module.ts` | Registrar la entidad en el módulo |

## Estructura de Datos de la Entidad: `RegistrationEntity`

> **Nota**: esta entidad **no** hereda de `BaseEntity` porque representa un log de auditoría médica inmutable.

| Atributo | Tipo DB | Campo TS | Decoradores TypeORM | Descripción |
|:---|:---|:---|:---|:---|
| `id` | `uuid` | `id` | `@PrimaryGeneratedColumn('uuid')` | PK autogenerada |
| `classification` | `enum` | `classification` | `@Column({ type: 'enum', enum: ['rojo', 'amarillo', 'verde', 'negro'], nullable: false })` | Triage (START/SALT) |
| `transferred_by` | `varchar(150)` | `transferredBy` | `@Column({ name: 'transferred_by', type: 'varchar', length: 150, nullable: true })` | Vehículo/unidad de traslado |
| `cellphone_transfer_manager` | `varchar(20)` | `cellphoneTransferManager` | `@Column({ name: 'cellphone_transfer_manager', type: 'varchar', length: 20, nullable: true })` | Celular del encargado de traslado |
| `notes` | `varchar(500)` | `notes` | `@Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })` | Observaciones médicas |
| `date` | `date` | `date` | `@Column({ name: 'date', type: 'date', nullable: false })` | Fecha del registro |
| `hour` | `varchar(10)` | `hour` | `@Column({ name: 'hour', type: 'varchar', length: 10, nullable: false })` | Hora del registro |
| `client_generated_id` | `uuid` | `clientGeneratedId` | `@Column({ name: 'client_generated_id', type: 'uuid', unique: true, nullable: true })` | Sync id para offline |
| `created_at` | `timestamp` | `createdAt` | `@CreateDateColumn({ name: 'created_at', type: 'timestamp' })` | Estampa de tiempo (inmutable) |

### Relaciones

- `@ManyToOne(() => VictimEntity)` con `@JoinColumn({ name: 'victim_id' })` — Víctima asociada.
- `@ManyToOne(() => Form207Entity)` con `@JoinColumn({ name: 'form207_id' })` — Formulario 207 de procedencia.
- `@ManyToOne(() => UserEntity)` con `@JoinColumn({ name: 'user_id' })` — Operador que registró el triage.

## Criterios de Aceptación

1. La entidad `RegistrationEntity` no hereda de `BaseEntity`.
2. No tiene campos `updatedAt` ni `isDeleted`.
3. El campo `classification` se valida estrictamente contra el enum `['rojo', 'amarillo', 'verde', 'negro']`.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test Unitario | Comprobar que no existe el método `update` ni campo `isDeleted` en `RegistrationEntity` | Verificado a nivel de código de entidad y esquema de base de datos |
