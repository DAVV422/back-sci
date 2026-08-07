# SPEC-F1-005: Rate Limiting en endpoints de autenticación

## Regla de referencia

- [reglas_implementacion.md §4.2](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Tokens y Sesión
- [flujos_del_sistema_v2.md §1](file:///c:/Proyectos/SCI/back-sci/docs/implementacion/flujos_del_sistema_v2.md) — ThrottlerGuard en login

## Descripción

Implementar rate limiting con `@nestjs/throttler` en los endpoints de login y refresh token para mitigar ataques de fuerza bruta. El throttler debe actuar antes de la lógica de autenticación.

## Estado actual

- No existe ningún mecanismo de rate limiting en el proyecto.
- `@nestjs/throttler` no está instalado.

## Dependencias npm nuevas

| Paquete | Propósito |
|:---|:---|
| `@nestjs/throttler` | Rate limiting por IP/ruta |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/app.module.ts` | Importar `ThrottlerModule.forRoot()` con configuración global |
| [MODIFY] | `src/auth/controllers/auth.controller.ts` | Aplicar `@Throttle()` con límites específicos en `login` y `refresh-token` |

## Configuración

```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  name: 'short',
  ttl: 60000,   // 1 minuto
  limit: 10,    // 10 requests por defecto
}])
```

```typescript
// auth.controller.ts — login
@Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 intentos/min
@Post('login')

// auth.controller.ts — refresh-token
@Throttle({ short: { ttl: 60000, limit: 10 } }) // 10 intentos/min
@Post('refresh-token')
```

## Criterios de aceptación

1. `POST /api/login` tiene límite de 5 intentos por minuto por IP
2. `POST /api/refresh-token` tiene límite de 10 intentos por minuto por IP
3. Al exceder el límite se devuelve HTTP 429 (Too Many Requests) con formato `ApiErrorResponse`
4. Los demás endpoints del sistema no se ven afectados por el throttle estricto de auth (usan el límite global más permisivo)

## Dependencia con otras specs

- **Requiere SPEC-F1-001** completada (para que el HTTP 429 use formato `ApiErrorResponse`)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test e2e | Enviar 6 requests consecutivas a `POST /api/login` | Requests 1-5: HTTP 200/404; Request 6: HTTP 429 |
| Test unitario | Verificar que `ThrottlerModule` está importado en `AppModule` | Módulo registrado correctamente |
