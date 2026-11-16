import { randomUUID } from 'crypto';
import { Options } from 'pino-http';

/**
 * Datos que nunca deben quedar escritos en los registros. `authorization` y las contraseñas ya
 * estaban; faltaban los tokens (activación, recuperación y refresco), que valen tanto como una
 * contraseña mientras no se usan.
 */
const OCULTOS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.newPassword',
  'req.body.currentPassword',
  'req.body.token',
  'req.body.refreshToken',
  'req.query.token',
  'res.headers["set-cookie"]',
];

export const pinoHttpOptions = (): Options => ({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: OCULTOS,
  genReqId: (req) => (req as any)['traceId'] || randomUUID(),

  // Quién hizo la petición. Lo deja `AuthGuard` en la request, y sin esto los registros dicen qué
  // pasó pero no de quién: no se puede auditar nada a partir de ellos.
  customProps: (req) => {
    const { idUser, roleUser } = req as any;
    return idUser ? { userId: idUser, role: roleUser } : {};
  },

  // Un 401 o un 404 son parte del funcionamiento normal: registrarlos como error dejaba los fallos
  // de verdad sepultados entre el ruido.
  customLogLevel: (_req, res, err) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
