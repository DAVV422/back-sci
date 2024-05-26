import { Module } from '@nestjs/common';
import { ProvidedController } from './controllers/provided.controller';
import { ProvidedService } from './services/provided.service';

@Module({
  controllers: [ProvidedController],
  providers: [ProvidedService]
})
export class ProvidedModule {}
