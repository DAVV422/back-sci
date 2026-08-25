import { Module, forwardRef } from '@nestjs/common';
import { ResourceController } from './controllers/resource.controller';
import { ResourceService } from './services/resource.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceEntity } from './entities/resource.entity';
import { EmergencyModule } from '../../organization_module/emergency/emergency.module';
import { EquipmentModule } from '../../organization_module/equipment/equipment.module';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceEntity]),
    EmergencyModule,
    EquipmentModule,
    forwardRef(() => UserModule),
  ],
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}
