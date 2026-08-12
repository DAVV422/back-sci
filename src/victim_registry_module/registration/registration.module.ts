import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationService } from './services/registration.service';
import { RegistrationController } from './controllers/registration.controller';
import { RegistrationEntity } from './entities/registration.entity';
import { UserModule } from '../../user/user.module';
import { Form207Module } from '../form-207/form-207.module';
import { VictimModule } from '../victim/victim.module';
import { EmergencyModule } from '../../organization_module/emergency/emergency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistrationEntity]),
    UserModule,
    Form207Module,
    VictimModule,
    EmergencyModule,
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [RegistrationService, TypeOrmModule],
})
export class RegistrationModule {}
