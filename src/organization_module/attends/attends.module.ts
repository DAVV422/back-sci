import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendEntity } from './entities/attends.entity';
import { AttendController } from './controllers/attends.controller';
import { AttendService } from './services/attends.service';
import { EmergencyModule } from '../emergency/emergency.module';
import { UserModule } from '../../user/user.module';
import { ChargesModule } from '../../sci_module/charges/charges.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => EmergencyModule),
    forwardRef(() => ChargesModule),
  ],
  controllers: [AttendController],
  providers: [AttendService],
  exports: [TypeOrmModule, AttendService],
})
export class AttendsModule {}
