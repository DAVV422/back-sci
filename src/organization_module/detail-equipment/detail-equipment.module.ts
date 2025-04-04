import { Module } from '@nestjs/common';
import { DetailEquipmentController } from './controllers/detail-equipment.controller';
import { DetailEquipmentService } from './services/detail-equipment.service';

@Module({
  controllers: [DetailEquipmentController],
  providers: [DetailEquipmentService]
})
export class DetailEquipmentModule {}
