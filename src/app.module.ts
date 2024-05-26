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
import { ActionModule } from './action/action.module';
import { AttendsModule } from './attends/attends.module';
import { SpecificDatesModule } from './specific-dates/specific-dates.module';
import { DetailEquipmentModule } from './detail-equipment/detail-equipment.module';
import { EmergencyModule } from './emergency/emergency.module';
import { EquipmentModule } from './equipment/equipment.module';
import { Form201Module } from './form-201/form-201.module';
import { Form207Module } from './form-207/form-207.module';
import { Form211Module } from './form-211/form-211.module';
import { ImagesModule } from './images/images.module';
import { PatientModule } from './patient/patient.module';
import { ProvidedModule } from './provided/provided.module';
import { RequestModule } from './request/request.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot({ ...DataSourceConfig }),
    MongooseModule.forRoot(process.env.URL_MONGO),
    ProvidersModule,
    CommonModule,
    UserModule,
    AuthModule,
    SeederModule,
    ActionModule,
    AttendsModule,
    SpecificDatesModule,
    DetailEquipmentModule,
    EmergencyModule,
    EquipmentModule,
    Form201Module,
    Form207Module,
    Form211Module,
    ImagesModule,
    PatientModule,
    ProvidedModule,
    RequestModule,
  ],
})
export class AppModule {}