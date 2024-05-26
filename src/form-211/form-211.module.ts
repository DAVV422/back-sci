import { Module } from '@nestjs/common';
import { Form211Controller } from './controllers/form-211.controller';
import { Form211Service } from './services/form-211.service';

@Module({
  controllers: [Form211Controller],
  providers: [Form211Service]
})
export class Form211Module {}
