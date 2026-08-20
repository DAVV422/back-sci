import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { NotificationEntity } from './entities/notification.entity';
import { DeviceTokenEntity } from './entities/device-token.entity';
import { NotificationService } from './services/notification.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { NotificationController } from './controllers/notification.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, DeviceTokenEntity]),
    JwtModule.register({}),
    UserModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
