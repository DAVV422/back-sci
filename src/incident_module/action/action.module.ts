import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionController } from './controllers/action.controller';
import { ActionService } from './services/action.service';
import { ActionEntity } from './entities/action.entity';
import { AudioEntity } from './entities/audio.entity';
import { UserModule } from './../../user/user.module';
import { EmergencyModule } from './../../organization_module/emergency/emergency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActionEntity, AudioEntity]),
    UserModule,
    EmergencyModule,
  ],
  controllers: [ActionController],
  providers: [ActionService],
  exports: [ActionService, TypeOrmModule],
})
export class ActionModule {}
