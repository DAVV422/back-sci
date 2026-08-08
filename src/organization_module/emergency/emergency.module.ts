import { Module } from '@nestjs/common';
import { EmergencyController } from './controllers/emergency.controller';
import { EmergencyService } from './services/emergency.service';
import { EmergencyEntity } from './entities/emergency.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './../../user/user.module';
import { DataFireEntity } from './entities/dataFires.entity';
import { DataFireController } from './controllers/dataFire.controller';
import { DataFireService } from './services/dataFire.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmergencyEntity, DataFireEntity]),
    UserModule,
  ],
  controllers: [EmergencyController, DataFireController],
  providers: [EmergencyService, DataFireService],
  exports: [TypeOrmModule, EmergencyService, DataFireService],
})
export class EmergencyModule {}
