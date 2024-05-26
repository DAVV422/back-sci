import { Module } from '@nestjs/common';
import { ControllersController } from './controllers/controllers.controller';
import { ActionController } from './controllers/action/action.controller';
import { ActionController } from './controllers/action.controller';
import { ActionService } from './services/action.service';

@Module({
  controllers: [ControllersController, ActionController],
  providers: [ActionService]
})
export class ActionModule {}
