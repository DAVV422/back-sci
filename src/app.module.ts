import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceConfig } from './config/data.source';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
// import { ProvidersModule } from './providers/providers.module';
import { CommonModule } from './common/common.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot({ ...DataSourceConfig }),
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
  ],
})
export class AppModule { }