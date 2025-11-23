import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form207Controller } from './controllers/form-207.controller';
import { Form207Service } from './services/form-207.service';
import { Form207Entity } from './entities/form-207.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Form207Entity])
  ],
  controllers: [Form207Controller],
  providers: [Form207Service],
  exports: [Form207Service, TypeOrmModule]
})
export class Form207Module {}
