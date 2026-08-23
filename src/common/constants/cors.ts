import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const getCorsOptions = (): CorsOptions => {
  const envOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL;
  const allowedOrigins = envOrigins
    ? envOrigins.split(',').map((o) => o.trim())
    : ['http://localhost:4200', 'http://localhost:8080', 'http://localhost:3000'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // If allowedOrigins contains wildcard, matches requesting origin, or in dev mode
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        process.env.APP_PROD !== 'true'
      ) {
        return callback(null, origin);
      }

      return callback(new Error(`Origen ${origin} no permitido por CORS`));
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'traceid',
      'x-trace-id',
      'Origin',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
};

export const CORS_OPTIONS: CorsOptions = getCorsOptions();
