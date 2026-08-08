import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form207Controller } from './controllers/form-207.controller';
import { Form207Service } from './services/form-207.service';
import { Form207Entity } from './entities/form-207.entity';
import { EmergencyForm207CounterEntity } from './entities/form-207-counter.entity';
import { UserModule } from '../../user/user.module';
import { EmergencyModule } from '../../organization_module/emergency/emergency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Form207Entity, EmergencyForm207CounterEntity]),
    UserModule,
    EmergencyModule,
  ],
  controllers: [Form207Controller],
  providers: [Form207Service],
  exports: [Form207Service, TypeOrmModule],
})
export class Form207Module {}
