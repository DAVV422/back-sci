# SPEC-F1-021: Logging estructurado (JSON) con `traceId`

## Regla de referencia

- [reglas_implementacion.md §5.1](file:///c:/Proyectos/SCI/back-sci/docs/reglas/reglas_implementacion.md) — Logging estructurado

## Descripción

Reemplazar los logs de texto plano (morgan + `console.log` dispersos) por logging estructurado en formato JSON con `traceId` propagado. Usar `nestjs-pino` como integración con NestJS.

## Estado actual

- [main.ts](file:///c:/Proyectos/SCI/back-sci/src/main.ts) usa `morgan('dev')` — logs de texto plano.
- Hay `console.log()` sueltos en servicios (ej. `resource.service.ts` L78).
- El `Logger` de NestJS se usa en algunos servicios pero emite texto plano.

## Dependencias npm nuevas

| Paquete | Propósito |
|:---|:---|
| `nestjs-pino` | Integración de Pino con NestJS |
| `pino-http` | Logger HTTP para requests |
| `pino-pretty` (devDependency) | Formato legible en desarrollo |

## Archivos a modificar

| Tipo | Ruta | Cambio |
|:---:|:---|:---|
| [MODIFY] | `src/app.module.ts` | Importar `LoggerModule.forRoot()` de `nestjs-pino` |
| [MODIFY] | `src/main.ts` | Reemplazar `morgan` por logger de Pino; configurar `bufferLogs: true` |
| [MODIFY] | Servicios con `console.log()` | Reemplazar por `this.logger.log()` de NestJS |

## Configuración

```typescript
// app.module.ts
import { LoggerModule } from 'nestjs-pino';

LoggerModule.forRoot({
  pinoHttp: {
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
    redact: ['req.headers.authorization', 'req.body.password'],
    genReqId: (req) => req['traceId'] || randomUUID(),
  },
})
```

```typescript
// main.ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
// Eliminar: app.use(morgan('dev'));
```

## Criterios de aceptación

1. Todos los logs se emiten en formato **JSON** con: `timestamp`, `level`, `traceId`, `module`, `message`
2. En desarrollo (`NODE_ENV !== 'production'`), se usa `pino-pretty` para legibilidad
3. En producción, se emite JSON puro (para ingestión por herramientas como ELK, CloudWatch, etc.)
4. El `traceId` generado por el middleware de SPEC-F1-001 se incluye en cada log de la request
5. **Nunca** se loguean: contraseñas, tokens completos, datos personales de víctimas
6. `req.headers.authorization` y `req.body.password` están en la lista de `redact`
7. No hay `console.log()` en ningún archivo del proyecto

## Dependencia con otras specs

- **Requiere SPEC-F1-001** (middleware de `traceId` para correlación de logs)

## Validación

| Tipo | Descripción | Resultado esperado |
|:---:|:---|:---|
| Test unitario | Configuración de Pino incluye `redact` para campos sensibles | Campos sensibles excluidos |
| Verificación manual | Ejecutar servidor → hacer request | Log JSON con `traceId`, `method`, `url`, `statusCode` |
| Verificación manual | `POST /api/login` con password | Password no aparece en logs |
| Grep automático | `grep -r "console.log" src/` | 0 resultados |
