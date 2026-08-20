import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { DataSourceConfig } from './config/data.source';
import { pinoHttpOptions } from './config/logger.config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
// import { ProvidersModule } from './providers/providers.module';
import { CommonModule } from './common/common.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { SeederModule } from './seeder/seeder.module';
// import { MongooseModule } from '@nestjs/mongoose';
import { ActionModule } from './incident_module/action/action.module';
import { AttendsModule } from './organization_module/attends/attends.module';
import { EmergencyModule } from './organization_module/emergency/emergency.module';
import { EquipmentModule } from './organization_module/equipment/equipment.module';
import { Form201Module } from './incident_module/form-201/form-201.module';
import { Form207Module } from './victim_registry_module/form-207/form-207.module';
import { ResourceModule } from './organization_module/resource/resource.module';
import { ChargesModule } from './sci_module/charges/charges.module';
import { VictimModule } from './victim_registry_module/victim/victim.module';
import { RegistrationModule } from './victim_registry_module/registration/registration.module';
import { NotificationModule } from './notification/notification.module';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggerModule.forRoot({ pinoHttp: pinoHttpOptions() }),
    TypeOrmModule.forRoot({ ...DataSourceConfig }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minuto
        limit: 10, // 10 requests por defecto
      },
    ]),
    // MongooseModule.forRoot(process.env.URL_MONGO),
    ChargesModule,
    // ProvidersModule,
    CommonModule,
    UserModule,
    AuthModule,
    SeederModule,
    ActionModule,
    AttendsModule,
    EmergencyModule,
    EquipmentModule,
    Form201Module,
    Form207Module,
    ResourceModule,
    VictimModule,
    RegistrationModule,
    NotificationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
