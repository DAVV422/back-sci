import { Module } from '@nestjs/common';
import { Form201Controller } from './controllers/form-201.controller';
import { Form201Service } from './services/form-201.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form201Entity } from './entities/form-201.entity';
import { ChargesModule } from '../../sci_module/charges/charges.module';
import { UserModule } from '../../user/user.module';
import { EmergencyModule } from '../../organization_module/emergency/emergency.module';
import { ActionModule } from '../action/action.module';
import { AttendsModule } from '../../organization_module/attends/attends.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Form201Entity]),
    ChargesModule,
    UserModule,
    EmergencyModule,
    ActionModule,
    AttendsModule,
  ],
  controllers: [Form201Controller],
  providers: [Form201Service],
  exports: [TypeOrmModule, Form201Service],
})
export class Form201Module {}
