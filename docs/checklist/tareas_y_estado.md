# Estado del Proyecto SCI y Matriz de Tareas

Este documento centraliza el estado actual del desarrollo del backend del sistema SCI, clasificando las tareas pendientes y completadas, describiendo los bugs conocidos identificados y el historial de cambios (Changelog) del proyecto.

---

## 1. Matriz de Tareas por Módulo

### Módulo de Autenticación y Usuarios
- [x] Implementación de JWT y Passport para protección de endpoints.
- [x] Estrategia de validación modular de tokens mediante interfaz `ITokenStrategy`.
- [x] Roles de acceso técnico del sistema (`BASIC`, `ADVANCED`, `MANAGER`, `ADMIN`).
- [x] Registro básico y consulta de usuarios.
- [ ] Implementación de Seeder para producción consumiendo variables de entorno.
- [ ] Estandarización de Guards de seguridad para todo el proyecto (evitar guards alternativos de Passport en rutas individuales).

### Módulo de Emergencias y Evaluación Inicial (Fase 1)
- [x] Creación y actualización de Emergencias.
- [x] Ubicaciones geográficas (Coordenadas de Incidente, PC y Staging).
- [ ] Creación de entidad `InitialAssessmentEntity` para evaluación preliminar de riesgos.
- [ ] Automatización de creación de Formulario 201 base al dar de alta una emergencia.
- [ ] Control estricto de transición de estados de emergencia (`p` -> `a` -> `f` / `c`).
- [ ] Lógica para bloquear la edición de datos de incidentes en estado "Finalizada".
- [ ] Refactorización a Soft Delete global en emergencias y relaciones.

### Estructura Organizativa SCI y Recursos
- [x] Carga de Cargos SCI (Seeders de niveles 1 al 5).
- [x] Asignación de personal a emergencias vinculando cargos del SCI (`attend`).
- [x] Registro de bitácora y eventos (`action`).
- [x] Catálogo de inventario de equipamiento (`equipment`).
- [x] Despacho y afectación de stock disponible de equipamiento a incidentes (`resource`).
- [ ] Flujo de validación para traspaso de comando (validando cierre de formularios y registro de bitácora).

### Formularios y Registro de Víctimas (Fase 2)
- [x] Creación de Formulario 201 y 207 (Estructura base).
- [x] Registro de triage y transferencias de víctimas.
- [ ] Implementación del campo `is_finalized` (booleano) en Formularios 201 y 207.
- [ ] Generación automática de códigos correlativos para formularios 207 (ej: `F207-001`).

---

## 2. Historial de Bugs Detectados

| ID | Componente | Descripción del Fallo | Estado | Prioridad |
| :--- | :--- | :--- | :---: | :---: |
| **BUG-001** | `UserController` | Los métodos `deactivate()` y `activate()` comparten el mismo decorador `@Get('/deactivate/:id')`. Esto previene que la reactivación de usuarios pueda ser ejecutada en la API. | Pendiente | Alta |
| **BUG-002** | `QueryDto` | Inyección SQL potencial a través del atributo dinámico `attr` interpolado directamente en el query builder en `UserService`. | Pendiente | Alta |
| **BUG-003** | `Form207 / Victim` | Los controladores de víctimas y registros de formularios 207 carecen de `@UseGuards()`, exponiendo los datos de manera pública en la red. | Pendiente | Alta |

---

## 3. Mejoras Propuestas (Roadmap de Refactorización)

1. **Estandarización de Respuestas de API**: Reemplazar la interfaz básica `ResponseMessage` por una clase genérica `ApiResponse<T>` que unifique el formato de éxito y error.
2. **Whitelist de Búsqueda**: Implementar una lista de atributos seguros permitidos para ordenamientos y búsquedas dinámicas en `QueryDto` para bloquear cualquier intento de inyección de parámetros.
3. **Soft Delete Universal**: Configurar `@DeleteDateColumn()` de TypeORM en todas las entidades del sistema para evitar pérdida de historial operativo crítico de incidentes reales.
4. **Dataset Forestal**: Migrar el módulo de incendios actual (`DataFireEntity`) al modelo unificado `dataset_fires` para construir la base de datos histórica utilizada por el módulo analítico predictivo.

---

## 4. Historial de Avances (Changelog)

### [2026-08-07] - Estructuración Inicial de la Arquitectura de Documentación
* **Hito**: Finalización del análisis del backend e inauguración del espacio técnico de documentación en `docs/`.
* **Decisiones Clave**:
  * Definición de flujos explícitos de cierre de emergencias y validación previa de formularios activos.
  * Adopción del estándar de Soft Delete universal para datos de emergencias.
  * Separación del rol técnico de acceso a la API del cargo organizativo operativo del SCI.
  * Adopción del prefijo de identificación correlativa de formularios `F207-XXX`.
