# SPEC-F2-007: Endpoints de Registro y Trazabilidad de Triage de Víctimas

## Regla de referencia

- [plan_implementacion.md §3 (Endpoints Fase 2)](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/plan_implementacion.md)
- [reglas_implementacion.md §7.1 (ApiResponse) y §7.2 (assertEditable)](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

Implementar controladores, servicios y DTOs para registrar el triage de víctimas (tabla `registration`), obtener el historial evolutivo de una víctima y listar los pacientes asignados a un Formulario 207 específico.

## Estado actual

- Existe el módulo `src/victim_registry_module/registration/` pero no tiene lógica de negocio ni controladores.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/victim_registry_module/registration/dto/create-registration.dto.ts` |
| [NEW] | `src/victim_registry_module/registration/controllers/registration.controller.ts` |
| [NEW] | `src/victim_registry_module/registration/services/registration.service.ts` |

## Endpoints a Implementar

| Método | Endpoint | Guard | Rol Mínimo | Descripción |
|:---:|:---|:---|:---:|:---|
| `POST` | `/api/form207/:form207Id/registration` | AuthGuard, RolesGuard | `BASIC` | Registrar triage de víctima en un F207 |
| `GET` | `/api/form207/:form207Id/registration` | AuthGuard, RolesGuard | `BASIC` | Listar víctimas registradas en este F207 |
| `GET` | `/api/victim/:victimId/registration` | AuthGuard, RolesGuard | `BASIC` | Consultar historial evolutivo de triage de una víctima |

## Lógica y Validaciones del Servicio

### Crear Registro (`POST`)
1. Validar que el Formulario 207 exista.
2. Validar que la emergencia asociada no esté finalizada/cancelada (`assertEditable`).
3. Validar que el Formulario 207 no esté ya finalizado (`is_finalized === false`).
4. Validar que la víctima exista.
5. Capturar la fecha y hora actual del servidor.
6. Guardar la entrada inmutable en `RegistrationEntity` (onDelete en cascada sobre víctima o F207).
7. Retornar `ApiResponse<RegistrationEntity>`.

### Listado por F207 (`GET /form207/:form207Id/registration`)
- Retornar todas las asignaciones vinculadas al F207, incluyendo la relación con `VictimEntity`.

### Historial de Víctima (`GET /victim/:victimId/registration`)
- Retornar los registros asociados a la víctima ordenados descendentemente por `created_at` para ver la evolución de su estado (ej. de amarillo a verde, o a negro).

## Criterios de Aceptación

1. El controlador está protegido por `AuthGuard` y `RolesGuard` (corrige BUG-003).
2. Se retorna `ApiResponse` formateada.
3. No existe un endpoint para editar (`PATCH`) ni eliminar (`DELETE`) registros de `registration` (es inmutable).
4. No permite registrar víctimas si el F207 está finalizado.

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test Unitario | Intentar registrar víctima en F207 finalizado | Lanza `BadRequestException` |
| Test e2e | Crear 2 registros para la misma víctima en diferentes F207 y consultar su historial | Devuelve un arreglo de 2 elementos ordenados de forma cronológica descendente |
