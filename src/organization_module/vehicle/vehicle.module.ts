import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleEntity } from './entities/vehicle.entity';
import { VehicleLoadItemEntity } from './entities/vehicle-load-item.entity';
import { VehicleDispatchEntity } from './entities/vehicle-dispatch.entity';
import { VehicleService } from './services/vehicle.service';
import { VehicleController } from './controllers/vehicle.controller';
import { ResourceModule } from '../resource/resource.module';
import { EmergencyModule } from '../emergency/emergency.module';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleEntity, VehicleLoadItemEntity, VehicleDispatchEntity]),
    ResourceModule,
    EmergencyModule,
    forwardRef(() => UserModule),
  ],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
