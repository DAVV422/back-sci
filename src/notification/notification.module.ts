import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { NotificationEntity } from './entities/notification.entity';
import { DeviceTokenEntity } from './entities/device-token.entity';
import { NotificationService } from './services/notification.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { RealtimeService } from './services/realtime.service';
import { RealtimeSubscriber } from './subscribers/realtime.subscriber';
import { NotificationController } from './controllers/notification.controller';
import { UserModule } from '../user/user.module';

// Global: RealtimeService se inyecta en servicios de varios módulos de dominio
// sin agregar más imports cruzados (forwardRef) entre módulos.
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, DeviceTokenEntity]),
    JwtModule.register({}),
    forwardRef(() => UserModule),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    RealtimeService,
    RealtimeSubscriber,
  ],
  exports: [NotificationService, NotificationGateway, RealtimeService],
})
export class NotificationModule {}
