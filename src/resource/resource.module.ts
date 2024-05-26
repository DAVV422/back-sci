import { Module } from '@nestjs/common';
import { ResourceController } from './controllers/resource.controller';
import { ResourceService } from './services/resource.service';

@Module({
  controllers: [ResourceController],
  providers: [ResourceService]
})
export class ResourceModule {}
