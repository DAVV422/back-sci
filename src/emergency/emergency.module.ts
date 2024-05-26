import { Module } from '@nestjs/common';
import { EmergencyController } from './controllers/emergency.controller';
import { EmergencyService } from './services/emergency.service';

@Module({
  controllers: [EmergencyController],
  providers: [EmergencyService]
})
export class EmergencyModule {}
