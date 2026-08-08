import { Module } from '@nestjs/common';
import { EmergencyController } from './controllers/emergency.controller';
import { InitialAssessmentController } from './controllers/initial-assessment.controller';
import { EmergencyService } from './services/emergency.service';
import { InitialAssessmentService } from './services/initial-assessment.service';
import { EmergencyEntity } from './entities/emergency.entity';
import { InitialAssessmentEntity } from './entities/initial-assessment.entity';
import { ActionEntity } from './../../incident_module/action/entities/action.entity';
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
      ActionEntity,
    ]),
    UserModule,
  ],
  controllers: [
    EmergencyController,
    DataFireController,
    InitialAssessmentController,
  ],
  providers: [EmergencyService, DataFireService, InitialAssessmentService],
  exports: [TypeOrmModule, EmergencyService, DataFireService],
})
export class EmergencyModule {}
