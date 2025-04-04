import { Module } from '@nestjs/common';
import { EquipmentController } from './controllers/equipment.controller';
import { EquipmentService } from './services/equipment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentEntity } from './entities/equipment.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EquipmentEntity]),
    UserModule
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService]
})
export class EquipmentModule {}
