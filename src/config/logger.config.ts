import { randomUUID } from 'crypto';
import { Options } from 'pino-http';

export const pinoHttpOptions = (): Options => ({
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: ['req.headers.authorization', 'req.body.password'],
  genReqId: (req) => (req as any)['traceId'] || randomUUID(),
});
