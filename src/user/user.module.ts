import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserEntity } from './entities/user.entity';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';

@Module({
  imports: [
    // `RefreshTokenEntity` para poder cerrar las sesiones al cambiar una contraseña: quien la
    // sabía antes no debe seguir dentro con una sesión abierta.
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    forwardRef(() => CommonModule),
    forwardRef(() => AuthModule),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, TypeOrmModule],
})
export class UserModule {}
