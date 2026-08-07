# SPEC-F1-001: Interfaz `ApiResponse<T>` y `ApiErrorResponse` estandarizada

## Regla de referencia

- [reglas_implementacion.md §3](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md)

## Descripción

Reemplazar la interfaz `ResponseMessage` actual por una interfaz genérica `ApiResponse<T>` para respuestas exitosas y `ApiErrorResponse` para errores. Incluir un campo `traceId` (UUID v4) generado por request que se propague a logs y respuestas de error. Crear un filtro global de excepciones HTTP que formatee todos los errores de forma consistente.

## Estado actual

- Existe [responseMessage.interface.ts](file:///c:/Proyectos/SCI/back-sci/src/common/interfaces/responseMessage.interface.ts) con una interfaz básica `{ statusCode, message?, error?, data? }` sin tipado genérico, sin `traceId`, sin `timestamp`, sin `path`.
- No existe filtro global de excepciones.
- No existe middleware de generación de `traceId`.
- Los controllers devuelven `ResponseMessage` directamente.

## Archivos a crear

| Tipo | Ruta |
|:---:|:---|
| [NEW] | `src/common/filters/http-exception.filter.ts` — Filtro global de excepciones que formatee todos los errores según `ApiErrorResponse` |
| [NEW] | `src/common/middleware/trace-id.middleware.ts` — Middleware que genere UUID v4 por request y lo adjunte al objeto `Request` |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/common/interfaces/responseMessage.interface.ts` | Reemplazar por `ApiResponse<T>` y `ApiErrorResponse` |
| [MODIFY] | `src/main.ts` | Registrar filtro global y middleware |
| [MODIFY] | Todos los controllers del proyecto | Adaptar tipo de retorno a `ApiResponse<T>` |

## Dependencias npm nuevas

| Paquete | Propósito |
|:---|:---|
| `uuid` | Generación de `traceId` UUID v4 |

## Estructuras de datos requeridas

### `ApiResponse<T>` (respuesta exitosa)
```typescript
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message?: string;
  data: T;
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

### `ApiErrorResponse` (respuesta de error)
```typescript
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  traceId: string;
}
```

## Criterios de aceptación

1. Toda respuesta exitosa sigue la estructura `{ success: true, statusCode, message?, data, meta? }`
2. Toda respuesta de error sigue `{ success: false, statusCode, message, error, timestamp, path, traceId }`
3. El `traceId` es un UUID v4 generado por request y aparece tanto en logs como en la respuesta de error
4. El campo `meta` con `total`, `limit`, `offset` se devuelve en endpoints paginados
5. El filtro global captura todas las excepciones HTTP (`BadRequestException`, `NotFoundException`, `UnauthorizedException`, etc.) y las formatea uniformemente

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | `HttpExceptionFilter` formatea `BadRequestException` | Estructura `ApiErrorResponse` con `statusCode: 400` |
| Test unitario | `HttpExceptionFilter` formatea `NotFoundException` | Estructura `ApiErrorResponse` con `statusCode: 404` |
| Test unitario | `HttpExceptionFilter` formatea excepción genérica (500) | Estructura `ApiErrorResponse` con `statusCode: 500` y `traceId` |
| Test unitario | `TraceIdMiddleware` agrega UUID al request | `request.traceId` es UUID v4 válido |
| Test e2e | `POST /api/login` con body vacío | HTTP 400, cuerpo con estructura `ApiErrorResponse` completa incluido `traceId` |
