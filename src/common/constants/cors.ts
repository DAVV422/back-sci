import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const CORS_OPTIONS: CorsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
};
