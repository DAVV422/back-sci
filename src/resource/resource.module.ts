import { Module } from '@nestjs/common';
import { ResourceController } from './controllers/resource.controller';
import { ResourceService } from './services/resource.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceEntity } from './entities/resource.entity';
import { EmergencyModule } from 'src/emergency/emergency.module';
import { EquipmentModule } from 'src/equipment/equipment.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceEntity]),
    EmergencyModule, EquipmentModule, UserModule
  ],
  controllers: [ResourceController],
  providers: [ResourceService],
  exports: [ResourceService]
})
export class ResourceModule {}
