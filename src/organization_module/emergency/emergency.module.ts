import { Module } from '@nestjs/common';
import { EmergencyController } from './controllers/emergency.controller';
import { EmergencyService } from './services/emergency.service';
import { EmergencyEntity } from './entities/emergency.entity';
import { InitialAssessmentEntity } from './entities/initial-assessment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './../../user/user.module';
import { DataFireEntity } from './entities/dataFires.entity';
import { DataFireController } from './controllers/dataFire.controller';
import { DataFireService } from './services/dataFire.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyEntity,
      DataFireEntity,
      InitialAssessmentEntity,
    ]),
    UserModule,
  ],
  controllers: [EmergencyController, DataFireController],
  providers: [EmergencyService, DataFireService],
  exports: [TypeOrmModule, EmergencyService, DataFireService],
})
export class EmergencyModule {}
