# SPEC-F1-006: Refresh Token con Rotación

## Regla de referencia

- [reglas_implementacion.md §4.2](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — JWT de acceso + refresh token con rotación
- [flujos_del_sistema_v2.md §1](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md) — Renovación de sesión

## Descripción

Actualmente el sistema solo genera un `accessToken` al hacer login. Se debe implementar un `refreshToken` con rotación: al emitir un nuevo refresh token, el anterior se revoca. El hash del refresh token se persiste en base de datos (nunca el token en texto plano).

## Estado actual

- [auth.service.ts](file:///c:/Proyectos/SCI/back-sci/src/auth/services/auth.service.ts) `generateJWT()` solo devuelve `{ accessToken, user }`.
- [auth.controller.ts](file:///c:/Proyectos/SCI/back-sci/src/auth/controllers/auth.controller.ts) no tiene endpoint de refresh.
- No existe entidad de refresh token.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/auth/entities/refresh-token.entity.ts` — Entidad para persistir hash de refresh tokens |
| [NEW] | `src/auth/dto/refresh-token.dto.ts` — DTO con `refreshToken: string` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/auth/services/auth.service.ts` | Generar y devolver `refreshToken` en `login()`; crear método `refreshToken()` |
| [MODIFY] | `src/auth/controllers/auth.controller.ts` | Agregar endpoint `POST /api/refresh-token` |
| [MODIFY] | `src/auth/auth.module.ts` | Registrar nueva entidad en `TypeOrmModule.forFeature()` |
| [MODIFY] | `src/auth/interfaces/login.interface.ts` | Agregar `refreshToken` al tipo `ILoginResponse` |

## Modelo de datos: `RefreshTokenEntity`

| Campo | Tipo | Notas |
|:---|:---|:---|
| `id` | UUID, PK | Hereda de `BaseEntity` |
| `user_id` | UUID, FK → user | Relación `@ManyToOne` |
| `token_hash` | varchar(255) | Hash SHA-256 (hex) del refresh token |
| `is_revoked` | boolean, default false | Se marca `true` al rotar |
| `expires_at` | timestamp | Fecha de expiración del token |
| `created_at` | timestamp | Hereda de `BaseEntity` |
| `updated_at` | timestamp | Hereda de `BaseEntity` |

## Flujo

```
1. POST /api/login → genera accessToken (corta duración) + refreshToken (larga duración)
2. Persistir sha256(refreshToken) en RefreshTokenEntity
3. POST /api/refresh-token { refreshToken }
   a. Buscar token por user_id donde is_revoked = false
   b. Comparar sha256(refreshToken) con token_hash
   c. Si válido: revocar token anterior (is_revoked = true), generar nuevos tokens
   d. Si inválido/revocado: HTTP 401
```

> **Nota:** se usa SHA-256 en lugar de bcrypt para el hash del refresh token porque bcrypt
> trunca la entrada en 72 bytes. Los JWT comparten los primeros 72 bytes (header + `sub` + `role` + `iat`),
> por lo que dos tokens distintos podrían validarse como el mismo, rompiendo la rotación.

## Criterios de aceptación

1. `POST /api/login` devuelve `{ accessToken, refreshToken, user }`
2. `POST /api/refresh-token` con `{ refreshToken }` válido devuelve nuevos `accessToken` y `refreshToken`
3. El refresh token anterior queda revocado (`is_revoked: true`) tras la rotación
4. Un refresh token revocado retorna HTTP 401
5. Un refresh token expirado retorna HTTP 401
6. El hash del refresh token se persiste en DB, nunca el token en texto plano
7. El endpoint de refresh es público (no requiere `AuthGuard`, el token de acceso ya puede estar expirado)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `AuthService.refreshToken()` con token válido | Genera nuevos tokens y revoca el anterior |
| Test unitario | `AuthService.refreshToken()` con token revocado | `UnauthorizedException` |
| Test unitario | `AuthService.refreshToken()` con token expirado | `UnauthorizedException` |
| Test e2e | Login → refresh → verificar que accessToken nuevo es funcional | Flujo completo exitoso |
| Test e2e | Login → refresh → segundo refresh con token antiguo | HTTP 401 |
