// Debe ser la primera importación: fija el proceso en UTC (ver config/timezone.ts).
import './config/timezone';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { getCorsOptions } from './common/constants';
import { Logger } from 'nestjs-pino';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule } from '@nestjs/swagger/dist';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { assertProductionConfig } from './config/production-check';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Con APP_PROD=true no se arranca con secretos de ejemplo (aquí el .env ya está cargado).
  assertProductionConfig();
  const isProduction = process.env.APP_PROD === 'true';
  const swaggerEnabled = !isProduction || process.env.SWAGGER_ENABLED === 'true';

  // Detrás de Nginx/Caddy: sin esto todas las peticiones parecen venir del proxy y el límite de
  // peticiones por IP se comparte entre todos los usuarios. Ej.: TRUST_PROXY=1 (un proxy delante).
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
  }

  app.use(
    helmet({
      // La API no sirve HTML salvo Swagger (que necesita scripts en línea) en desarrollo.
      contentSecurityPolicy: swaggerEnabled ? false : undefined,
      // Las fotos de perfil se cargan con <img> desde el dominio del front.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter()); // Format all errors consistently
  app.setGlobalPrefix('api'); // Set the global prefix for all routes
  app.enableCors(getCorsOptions()); // Enable CORS
  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta las propiedades que el DTO no declara (antes se aceptaban y llegaban a la base).
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  ); // Enable validation

  const reflector = app.get('Reflector');
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector)); // Enable transformation

  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  const title: string = configService.get('APP_NAME');
  const url = configService.get('APP_URL');

  // Swagger expone el mapa completo de la API: en producción solo con SWAGGER_ENABLED=true.
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .addBearerAuth()
      .setTitle(title)
      .setDescription(
        'Documentación de API del proyecto de Gestión de Emergencias basado en el Sistema de Comando de Incidentes (SCI)',
      )
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
  app.get(Logger).log(`Application is running on: ${url}`, 'Bootstrap');
}
bootstrap();
