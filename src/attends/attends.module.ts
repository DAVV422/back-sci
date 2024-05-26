import { Module } from '@nestjs/common';
import { AttendsController } from './controllers/attends.controller';
import { AttendsService } from './services/attends.service';

@Module({
  controllers: [AttendsController],
  providers: [AttendsService]
})
export class AttendsModule {}
