import { Module } from '@nestjs/common';
import { ActionController } from './controllers/action.controller';
import { ActionService } from './services/action.service';

@Module({  
  controllers: [ActionController],
  providers: [ActionService],
})
export class ActionModule {}
