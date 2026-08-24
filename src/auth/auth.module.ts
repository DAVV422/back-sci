import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { UserService } from '../user/services/user.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './services/implementacion/jwt.strategy';
import { TokenValidatorService } from './services/token-validator.service';
import { ITokenStrategy } from './services/token-strategy';
import { JwtServiceAdapter } from './services/jwt.service';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
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
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [
    {
      provide: 'ITokenStrategy',
      useClass: JwtStrategy, // Estrategia en uso para la validación del token
    },
    {
      provide: TokenValidatorService,
      useFactory: (strategy: JwtStrategy) =>
        new TokenValidatorService(strategy, new JwtService()),
      inject: ['ITokenStrategy'],
    },
    AuthService,
    UserService,
    JwtServiceAdapter,
    AuthTokenService,
  ],
  controllers: [AuthController],
  exports: [PassportModule, AuthTokenService, AuthService],
})
export class AuthModule {}
