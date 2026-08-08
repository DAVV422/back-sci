# SPEC-F2-005: Entidad `VictimEntity` y Endpoints de Gestión de Víctimas

## Regla de referencia

- [plan_implementacion.md §1, §2 (victim) y §3 (Endpoints)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §1.1 (BaseEntity) y §7.1 (ApiResponse)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

La víctima representa la persona afectada en el incidente. Es una entidad independiente de los formularios (puede registrarse en múltiples F207 a lo largo de su tratamiento). Se debe crear la entidad `VictimEntity` y sus endpoints CRUD básicos.

## Estado actual

- Existe la estructura en `src/victim_registry_module/victim/` pero requiere revisión para asegurar el uso de `BaseEntity` y protección de rutas con guards (BUG-003).

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/victim_registry_module/victim/dto/create-victim.dto.ts` |
| [NEW] | `src/victim_registry_module/victim/dto/update-victim.dto.ts` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/victim_registry_module/victim/entities/victim.entity.ts` | Heredar de `BaseEntity` (`id`, `isDeleted`, `createdAt`, `updatedAt`); agregar `client_generated_id` |
| [MODIFY] | `src/victim_registry_module/victim/controllers/victim.controller.ts` | Añadir `@UseGuards(AuthGuard, RolesGuard)`; implementar endpoints |
| [MODIFY] | `src/victim_registry_module/victim/services/victim.service.ts` | Implementar lógica de persistencia y soft-delete |

## Modelo de Datos: `VictimEntity`

Hereda de `BaseEntity`.

| Atributo | Tipo DB | Campo TS | Decoradores TypeORM / Validación | Descripción |
|:---|:---|:---|:---|:---|
| `identifier` | `varchar(50)` | `identifier` | `@Column({ name: 'identifier', type: 'varchar', length: 50, nullable: true })` | Nombre o "NN-XXX" |
| `age_estimated` | `int` | `ageEstimated` | `@Column({ name: 'age_estimated', type: 'int', nullable: true })` | Edad estimada |
| `gender` | `varchar(20)` | `gender` | `@Column({ name: 'gender', type: 'varchar', length: 20, nullable: true })` | Género |
| `cellphone` | `varchar(20)` | `cellphone` | `@Column({ name: 'cellphone', type: 'varchar', length: 20, nullable: true })` | Celular |
| `reference_cellphone` | `varchar(20)` | `referenceCellphone` | `@Column({ name: 'reference_cellphone', type: 'varchar', length: 20, nullable: true })` | Contacto de familiar |
| `client_generated_id` | `uuid` | `clientGeneratedId` | `@Column({ name: 'client_generated_id', type: 'uuid', unique: true, nullable: true })` | Offline sync id |

## Endpoints

| Método | Endpoint | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `POST` | `/api/victim` | AuthGuard, RolesGuard | `BASIC` | Registrar datos básicos de una víctima |
| `GET` | `/api/victim/:id` | AuthGuard, RolesGuard | `BASIC` | Consultar ficha de víctima |
| `PATCH` | `/api/victim/:id` | AuthGuard, RolesGuard | `BASIC` | Actualizar datos básicos de víctima |

## Criterios de Aceptación

1. `VictimEntity` extiende de `BaseEntity`.
2. Todos los endpoints están protegidos por `AuthGuard` y `RolesGuard` (corrige BUG-003).
3. Las respuestas de API están estandarizadas con `ApiResponse`.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test e2e | `POST /api/victim` sin token | HTTP 401 Unauthorized |
| Test e2e | `POST /api/victim` con payload correcto | HTTP 201 Created y retorna la víctima |
