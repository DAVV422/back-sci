import { Module } from '@nestjs/common';
import { RequestController } from './controllers/request.controller';
import { RequestService } from './services/request.service';

@Module({
  controllers: [RequestController],
  providers: [RequestService]
})
export class RequestModule {}
