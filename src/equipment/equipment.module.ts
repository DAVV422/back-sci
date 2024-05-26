import { Module } from '@nestjs/common';
import { EquipmentController } from './controllers/equipment.controller';
import { EquipmentService } from './services/equipment.service';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService]
})
export class EquipmentModule {}
