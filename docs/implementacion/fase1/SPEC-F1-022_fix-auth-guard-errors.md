# SPEC-F1-022: Corrección de `AuthGuard` — Error handling específico

## Regla de referencia

- Código actual de [auth.guard.ts](file:///c:/Proyectos/SCI/back-sci/src/auth/guards/auth.guard.ts)

## Descripción

El `AuthGuard` actual atrapa **todos** los errores con un `catch` genérico y lanza `InternalServerErrorException` (HTTP 500), perdiendo la información original del error. Por ejemplo, un token inválido que debería devolver HTTP 401 devuelve HTTP 500 con el mensaje `'Error al validar el token'`. Debe propagar correctamente las excepciones HTTP conocidas.

## Estado actual

```typescript
// auth.guard.ts L30-32 — problema actual
} catch (error) {
  throw new InternalServerErrorException('Error al validar el token');
}
```

Esto oculta:
- `UnauthorizedException('Token no encontrado')` → se convierte en 500
- `UnauthorizedException('Token expirado')` → se convierte en 500
- `NotFoundException('Usuario no encontrado')` → se convierte en 500

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/auth/guards/auth.guard.ts` | Re-throw de `HttpException` conocidas; solo `InternalServerErrorException` para errores inesperados |

## Corrección esperada

```typescript
} catch (error) {
  if (error instanceof HttpException) {
    throw error; // Propagar 401, 403, 404, etc. tal cual
  }
  throw new InternalServerErrorException('Error interno al validar el token');
}
```

## Criterios de aceptación

1. Token inválido → HTTP 401 `UnauthorizedException` (no 500)
2. Token expirado → HTTP 401 `UnauthorizedException` (no 500)
3. Token ausente → HTTP 401 `UnauthorizedException` (no 500)
4. Usuario del token no encontrado → HTTP 401 `UnauthorizedException` (no 500)
5. Error inesperado de DB u otro → HTTP 500 `InternalServerErrorException`
6. El mensaje original de la excepción se preserva

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Request sin header `Authorization` | `UnauthorizedException` (401), mensaje: 'Token no encontrado' |
| Test unitario | Request con token expirado | `UnauthorizedException` (401), mensaje: 'Token expirado' |
| Test unitario | Request con token de usuario inexistente | `UnauthorizedException` (401) |
| Test unitario | Simular error de DB en `findOneAuth` | `InternalServerErrorException` (500) |
| Test e2e | Request sin token a endpoint protegido | HTTP 401 (no 500) |
