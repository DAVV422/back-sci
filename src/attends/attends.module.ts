import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendEntity } from './entities/attends.entity';
import { UserModule } from 'src/user/user.module';
import { EmergencyModule } from 'src/emergency/emergency.module';
import { AttendController } from './controllers/attends.controller';
import { AttendService } from './services/attends.service';
import { ChargesModule } from 'src/charges/charges.module';

@Module({
  imports: [TypeOrmModule.forFeature([AttendEntity]),
    UserModule, EmergencyModule, ChargesModule
  ],
  controllers: [AttendController],
  providers: [AttendService],
  exports: [TypeOrmModule, AttendService]
})
export class AttendsModule {}
