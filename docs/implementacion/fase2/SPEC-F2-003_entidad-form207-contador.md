# SPEC-F2-003: Entidad `Form207Entity` y Tabla de Contador `EmergencyForm207Counter`

## Regla de referencia

- [plan_implementacion.md §1 (Fase 2) y §2 (Form207 y Contador)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §7.3 (Transacciones/Locks)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

El Formulario 207 (F207) sirve como contenedor para el triage y registro de víctimas de una emergencia. A diferencia del F201, se permiten múltiples F207 por emergencia. Para generar códigos correlativos consecutivos seguros frente a concurrencia (ej. `F207-001`, `F207-002`, ...), se debe implementar una tabla y lógica de contador atómico por emergencia.

## Estado actual

- Existe la estructura de `Form207Entity` pero requiere revisión para alinearse con `BaseEntity` y añadir `client_generated_id`.
- No existe la tabla de contador en el código ni su lógica.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/victim_registry_module/form-207/entities/form-207-counter.entity.ts` — Entidad del contador atómico |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/victim_registry_module/form-207/entities/form-207.entity.ts` | Extender de `BaseEntity`, heredar campos comunes, agregar `client_generated_id` |
| [MODIFY] | `src/victim_registry_module/form-207/form-207.module.ts` | Registrar las entidades en `TypeOrmModule` |

## Modelo de Datos

### `Form207Entity`

Hereda de `BaseEntity`.

| Atributo | Tipo DB | Campo TS | Decoradores TypeORM / Validación | Descripción |
|:---|:---|:---|:---|:---|
| `code` | `varchar(15)` | `code` | `@Column({ name: 'code', type: 'varchar', length: 15, nullable: false })` | Correlativo del formulario (ej. `F207-001`) |
| `date` | `date` | `date` | `@Column({ name: 'date', type: 'date', nullable: false })` | Fecha del formulario |
| `is_finalized` | `boolean` | `isFinalized` | `@Column({ name: 'is_finalized', type: 'boolean', default: false })` | Estado del formulario |
| `client_generated_id` | `uuid` | `clientGeneratedId` | `@Column({ name: 'client_generated_id', type: 'uuid', unique: true, nullable: true })` | Deduplicación offline |

**Relaciones**:
- `@ManyToOne(() => EmergencyEntity)` con `@JoinColumn({ name: 'emergency_id' })` — Emergencia (onDelete: 'CASCADE').
- `@ManyToOne(() => UserEntity)` con `@JoinColumn({ name: 'user_id' })` — Operador creador.
- `@OneToMany(() => RegistrationEntity)` — Registros de víctimas contenidos.

---

### `EmergencyForm207CounterEntity`

Se utiliza para mantener de forma segura el último número secuencial por emergencia.

```typescript
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ name: 'emergency_form207_counter' })
export class EmergencyForm207CounterEntity {
  @PrimaryColumn({ type: 'uuid', name: 'emergency_id' })
  emergencyId: string;

  @Column({ name: 'last_value', type: 'integer', default: 0 })
  lastValue: number;
}
```

## Lógica del Contador Atómico en la Creación (Transacción)

Al insertar un nuevo Formulario 207:
1. Iniciar una transacción de TypeORM.
2. Hacer un `UPSERT` e incrementar de forma atómica:
   ```sql
   INSERT INTO emergency_form207_counter (emergency_id, last_value)
   VALUES ($1, 1)
   ON CONFLICT (emergency_id)
   DO UPDATE SET last_value = emergency_form207_counter.last_value + 1
   RETURNING last_value;
   ```
3. Utilizar el valor devuelto para armar el `code` del nuevo F207 (ej. `'F207-' + String(lastValue).padStart(3, '0')`).
4. Persistir el F207 y confirmar la transacción.

## Criterios de Aceptación

1. La tabla `emergency_form207_counter` previene colisiones o saltos inconsistentes en la numeración secuencial de los formularios F207 incluso bajo condiciones de alta concurrencia.
2. El F207 hereda de `BaseEntity`.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test de Integración | Crear 10 Formularios 207 concurrentes para la misma emergencia | Los códigos generados son exactamente `F207-001` a `F207-010` sin duplicados ni saltos |
