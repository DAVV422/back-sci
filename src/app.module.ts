import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceConfig } from './config/data.source';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ProvidersModule } from './providers/providers.module';
import { CommonModule } from './common/common.module';
import { SeederModule } from './seeder/seeder.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ActionModule } from './incident_module/action/action.module';
import { AttendsModule } from './organization_module/attends/attends.module';
import { DetailEquipmentModule } from './organization_module/detail-equipment/detail-equipment.module';
import { EmergencyModule } from './organization_module/emergency/emergency.module';
import { EquipmentModule } from './organization_module/equipment/equipment.module';
import { Form201Module } from './incident_module/form-201/form-201.module';
import { Form207Module } from './victim_registry_module/form-207/form-207.module';
import { Form211Module } from './resource_control_module/form-211/form-211.module'; 
import { PatientModule } from './victim_registry_module/patient/patient.module';
import { ProvidedModule } from './resource_control_module/provided/provided.module';
import { RequestModule } from './resource_control_module/request/request.module';
import { ResourceModule } from './resource_control_module/resource/resource.module';
import { ChargesModule } from './sci_module/charges/charges.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot({ ...DataSourceConfig }),
    MongooseModule.forRoot(process.env.URL_MONGO),
    ChargesModule,
    ProvidersModule,
    CommonModule,
    UserModule,
    AuthModule,
    SeederModule,
    ActionModule,
    AttendsModule,
    DetailEquipmentModule,
    EmergencyModule,
    EquipmentModule,
    Form201Module,
    Form207Module,
    Form211Module,
    PatientModule,
    ProvidedModule,
    RequestModule,
    ResourceModule,
  ],
})
export class AppModule {}