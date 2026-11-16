import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InstitutionEntity } from './entities/institution.entity';
import { InstitutionService } from './services/institution.service';
import { InstitutionController } from './controllers/institution.controller';
import { AppConfigController } from './controllers/app-config.controller';
import { CommonModule } from '../common/common.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InstitutionEntity]),
    CommonModule,
    forwardRef(() => UserModule),
  ],
  controllers: [AppConfigController, InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
