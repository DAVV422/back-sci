import { Module } from '@nestjs/common';
import { ActionController } from './controllers/action.controller';
import { ActionService } from './services/action.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionEntity } from './entities/action.entity';

@Module({  
  imports: [
    TypeOrmModule.forFeature([ActionEntity])
  ],
  controllers: [ActionController],
  providers: [ActionService],
})
export class ActionModule {}
