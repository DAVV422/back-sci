import { Module } from '@nestjs/common';
import { EmergencyController } from './controllers/emergency.controller';
import { EmergencyService } from './services/emergency.service';
import { EmergencyEntity } from './entities/emergency.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmergencyEntity]),
    UserModule
  ],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports:[ TypeOrmModule, EmergencyService ]
})
export class EmergencyModule {}
