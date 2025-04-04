import { Module } from '@nestjs/common';
import { Form207Controller } from './controllers/form-207.controller';
import { Form207Service } from './services/form-207.service';

@Module({
  controllers: [Form207Controller],
  providers: [Form207Service]
})
export class Form207Module {}
