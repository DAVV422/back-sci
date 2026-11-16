import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UserService } from '../user/services/user.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';
import { JwtServiceAdapter } from './services/jwt.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuthTokenEntity } from './entities/auth-token.entity';
import { AuthTokenService } from './services/auth-token.service';
import { CommonModule } from '../common/common.module';

@Global()
@Module({
  imports: [
    forwardRef(() => UserModule),
    ConfigModule,
    CommonModule,
    TypeOrmModule.forFeature([RefreshTokenEntity, AuthTokenEntity]),
  ],
  // La autenticación de cada petición la hace `AuthGuard` con `verifyAccessToken`, no Passport:
  // la estrategia de Passport nunca se usó como guard y se retiró junto con `checkToken`.
  providers: [AuthService, JwtServiceAdapter, AuthTokenService],
  controllers: [AuthController],
  exports: [AuthTokenService, AuthService],
})
export class AuthModule {}
