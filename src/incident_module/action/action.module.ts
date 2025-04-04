import { Module } from '@nestjs/common';
import { ActionController } from './controllers/action.controller';
import { ActionService } from './services/action.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionEntity } from './entities/action.entity';
import { UserModule } from './../user/user.module';
import { EmergencyModule } from './../emergency/emergency.module';

@Module({  
  imports: [
    TypeOrmModule.forFeature([ActionEntity]),
    UserModule, EmergencyModule
  ],
  controllers: [ActionController],
  providers: [ActionService],
  exports: [ActionService, TypeOrmModule]
})
export class ActionModule {}
