import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthFacilityEntity } from './entities/health-facility.entity';
import { HealthFacilityService } from './services/health-facility.service';
import { HealthFacilityController } from './controllers/health-facility.controller';
import { UserModule } from '../../user/user.module';

@Module({
  // UserModule: lo necesita el AuthGuard del controlador.
  imports: [TypeOrmModule.forFeature([HealthFacilityEntity]), forwardRef(() => UserModule)],
  controllers: [HealthFacilityController],
  providers: [HealthFacilityService],
  exports: [HealthFacilityService],
})
export class HealthFacilityModule {}
