# Estado del Proyecto SCI y Matriz de Tareas

Este documento centraliza el estado actual del desarrollo del backend del sistema SCI, clasificando las tareas pendientes y completadas, describiendo los bugs conocidos identificados y el historial de cambios (Changelog) del proyecto.

---

## 1. Matriz de Tareas por Módulo

### Módulo de Autenticación y Usuarios (Fase 1)
- [x] Implementación de JWT y Passport para protección de endpoints.
- [x] Estrategia de validación modular de tokens mediante interfaz `ITokenStrategy`.
- [x] Roles de acceso técnico del sistema (`BASIC`, `ADVANCED`, `MANAGER`, `ADMIN`).
- [x] Registro básico y consulta de usuarios.
- [x] Implementación de Seeder para producción consumiendo variables de entorno.
- [x] Estandarización de Guards de seguridad para todo el proyecto.
- [x] Refresh Token con rotación y persistencia segura en base de datos.
- [x] Endpoints `/me` para consulta y edición de perfil del usuario logueado.

### Módulo de Emergencias y Evaluación Inicial (Fase 1)
- [x] Creación y actualización de Emergencias.
- [x] Ubicaciones geográficas (Coordenadas de Incidente, PC y Staging).
- [x] Creación de entidad `InitialAssessmentEntity` para evaluación preliminar de riesgos.
- [x] Generación de código correlativo de emergencia EMG-XXX.
- [x] Control estricto de transición de estados de emergencia mediante máquina de estados.
- [x] Lógica para bloquear la edición de datos de incidentes en estado "Finalizada".
- [x] Refactorización a Soft Delete global en emergencias y relaciones.

### Estructura Organizativa SCI y Recursos (Fase 1)
- [x] Carga de Cargos SCI (Seeders de niveles 1 al 5).
- [x] Asignación de personal a emergencias vinculando cargos del SCI (`attend`).
- [x] Registro de bitácora y eventos (`action`).
- [x] Catálogo de inventario de equipamiento (`equipment`).
- [x] Despacho y afectación de stock disponible de equipamiento a incidentes (`resource`).
- [x] Lógica de devolución de recursos para incrementar stock disponible.
- [x] Auditoría operativa automática (AuditLogEntity + Interceptor + Subscriber).

### Formularios y Registro de Víctimas (Fase 2)
- [ ] **SPEC-F2-001**: Implementar `Form201Entity` con su correspondiente índice único parcial.
- [ ] **SPEC-F2-002**: Desarrollar los endpoints y DTOs para la gestión del Formulario 201 (`POST`, `GET`, `PATCH`, `PATCH /finalize`, `DELETE`).
- [ ] **SPEC-F2-003**: Implementar `Form207Entity` y la tabla `EmergencyForm207Counter` para control de correlativos de forma concurrente.
- [ ] **SPEC-F2-004**: Desarrollar los endpoints del Formulario 207 aplicando protección de Guards y control de finalización.
- [ ] **SPEC-F2-005**: Definir la entidad `VictimEntity` y sus rutas CRUD básicas protegidas.
- [ ] **SPEC-F2-006**: Crear la entidad intermedia inmutable `RegistrationEntity` para logs de triage.
- [ ] **SPEC-F2-007**: Implementar endpoints de registro y consulta histórica de triage de víctimas.
- [ ] **SPEC-F2-008**: Desarrollar el módulo de notificaciones en tiempo real (`NotificationEntity` + WebSockets + FCM).
- [ ] **SPEC-F2-009**: Integrar soporte de idempotencia de `client_generated_id` en los servicios de creación.
- [ ] **SPEC-F2-010**: Implementar el procesador y endpoint de sincronización en lote (`POST /api/sync/batch`) y código de error `SYNC_CONFLICT_EMERGENCY_CLOSED`.

---

## 2. Historial de Bugs Detectados

| ID | Componente | Descripción del Fallo | Estado | Prioridad |
| :--- | :--- | :--- | :---: | :---: |
| **BUG-001** | `UserController` | Los métodos `deactivate()` y `activate()` compartían ruta. Se unificó a un único `PATCH /status/:id` seguro. | **Corregido** | Alta |
| **BUG-002** | `QueryDto` | Inyección SQL potencial a través de `attr` interpolado en query builders. Corregido con whitelist de búsqueda. | **Corregido** | Alta |
| **BUG-003** | `Form207 / Victim` | Controladores carecían de guards. Se requiere aplicar `@UseGuards(AuthGuard, RolesGuard)` en la implementación de la Fase 2. | **Corregido** | Alta |

---

## 3. Mejoras Propuestas (Roadmap de Refactorización)

1. **Estandarización de Respuestas de API**: Reemplazada por `ApiResponse<T>` y `ApiErrorResponse` con `traceId` en Fase 1.
2. **Whitelist de Búsqueda**: Implementada en `QueryDto` mediante decorador `AllowedQueryAttrs` en Fase 1.
3. **Soft Delete Universal**: Implementado en `BaseEntity` y propagado a todas las entidades en Fase 1.
4. **Dataset Forestal**: Planificado para la Fase 3.

---

## 4. Historial de Avances (Changelog)

### [2026-08-08] - Cierre y Estabilización de la Fase 1
* **Hito**: Fase 1 completada en su totalidad.
* **Cambios**:
  * Implementada la respuesta API estandarizada con `traceId` global.
  * Añadida la máquina de estados de emergencia con sus restricciones operativas.
  * Incorporado el Soft Delete heredado por `BaseEntity`.
  * Integrada auditoría operativa en tiempo real para todas las modificaciones.
  * Creación y aprobación de las especificaciones de la Fase 2 (`SPEC-F2-001` a `SPEC-F2-010`).

### [2026-08-07] - Estructuración Inicial de la Arquitectura de Documentación
* **Hito**: Finalización del análisis del backend e inauguración del espacio técnico de documentación en `docs/`.
