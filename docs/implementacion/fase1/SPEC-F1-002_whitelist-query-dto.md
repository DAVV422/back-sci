# SPEC-F1-002: Whitelist de Atributos en `QueryDto` (Fix BUG-002)

## Regla de referencia

- [reglas_implementacion.md §4](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Whitelist en Query DTO
- [tareas_y_estado.md BUG-002](file:///c:/Proyectos/SCI/back-sci/docs/checklist/tareas_y_estado.md) — Inyección SQL potencial

## Descripción

El parámetro `attr` en `QueryDto` se interpola directamente en el QueryBuilder (`user.${attr} ILIKE :value`), lo que permite inyección SQL. Se debe implementar una whitelist configurable por entidad que valide el atributo antes de interpolarlo en la consulta.

## Estado actual

- [query.dto.ts](file:///c:/Proyectos/SCI/back-sci/src/common/dto/query.dto.ts) acepta cualquier `string` en `attr` sin validación.
- [user.service.ts](file:///c:/Proyectos/SCI/back-sci/src/user/services/user.service.ts) L28: `query.where(\`user.${attr} ILIKE :value\`...)` — interpolación directa.
- [emergency.service.ts](file:///c:/Proyectos/SCI/back-sci/src/organization_module/emergency/services/emergency.service.ts) L34: mismo patrón de interpolación directa.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/common/decorators/allowed-query-attrs.decorator.ts` — Helper o constante de whitelist reutilizable por servicio |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/common/dto/query.dto.ts` | Documentar uso seguro del campo `attr` |
| [MODIFY] | `src/user/services/user.service.ts` | Validar `attr` contra whitelist antes de interpolarlo |
| [MODIFY] | `src/organization_module/emergency/services/emergency.service.ts` | Misma validación de whitelist |

## Whitelists por entidad

```typescript
// UserEntity
const USER_ALLOWED_ATTRS = ['name', 'email', 'is_active', 'role', 'last_name'];

// EmergencyEntity
const EMERGENCY_ALLOWED_ATTRS = ['name', 'state', 'type', 'date', 'code'];
```

## Criterios de aceptación

1. Si `attr` no está en la whitelist de la entidad consultada, se lanza `BadRequestException('Atributo de búsqueda no permitido.')`
2. La whitelist es un arreglo de strings constante definido por cada servicio o como decorador reutilizable
3. No se interpola ningún valor de `attr` que no haya pasado la validación
4. El patrón se documenta para que futuros servicios lo repliquen

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `UserService.findAll()` con `attr = 'password'` | `BadRequestException` |
| Test unitario | `UserService.findAll()` con `attr = 'name'` | Ejecuta sin error |
| Test unitario | `EmergencyService.findAll()` con `attr = '; DROP TABLE--'` | `BadRequestException` |
| Test unitario | `EmergencyService.findAll()` con `attr = 'state'` | Ejecuta sin error |
