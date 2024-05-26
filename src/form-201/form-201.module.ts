import { Module } from '@nestjs/common';
import { Form201Controller } from './controllers/form-201.controller';
import { Form201Service } from './services/form-201.service';

@Module({
  controllers: [Form201Controller],
  providers: [Form201Service]
})
export class Form201Module {}
