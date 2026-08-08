import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { CORS_OPTIONS } from './common/constants';
import { Logger } from 'nestjs-pino';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule } from '@nestjs/swagger/dist';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.useGlobalFilters(new HttpExceptionFilter()); // Format all errors consistently
  app.setGlobalPrefix('api'); // Set the global prefix for all routes
  app.enableCors(CORS_OPTIONS); // Enable CORS
  app.useGlobalPipes(
    new ValidationPipe({
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

  await app.listen(port);
  app.get(Logger).log(`Application is running on: ${url}`, 'Bootstrap');
}
bootstrap();
