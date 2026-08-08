import { Global, Module } from '@nestjs/common';
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

@Global()
@Module({
  imports: [
    UserModule,
    ConfigModule,
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  providers: [
    {
      provide: 'ITokenStrategy',
      useClass: JwtStrategy, // Estrategia en uso para la validacion del token
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
  ],
  controllers: [AuthController],
  exports: [PassportModule],
})
export class AuthModule {}
