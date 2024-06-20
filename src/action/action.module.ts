import { Module } from '@nestjs/common';
import { ActionController } from './controllers/action.controller';
import { ActionService } from './services/action.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionEntity } from './entities/action.entity';
import { UserModule } from 'src/user/user.module';
import { Form201Module } from 'src/form-201/form-201.module';

@Module({  
  imports: [
    TypeOrmModule.forFeature([ActionEntity]),
    UserModule, Form201Module
  ],
  controllers: [ActionController],
  providers: [ActionService],
  exports: [ActionService, TypeOrmModule]
})
export class ActionModule {}
