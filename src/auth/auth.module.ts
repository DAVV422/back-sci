import { Global, Module } from '@nestjs/common';

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

@Global()
@Module({
  imports: [UserModule, ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    {
      provide: 'ITokenStrategy',
      useClass: JwtStrategy, // Estrategia en uso para la validacion del token
    },
    {
      provide: TokenValidatorService,
      useFactory: (strategy: JwtStrategy) => new TokenValidatorService(strategy, new JwtService()),
      inject: ['ITokenStrategy'],
    },
    AuthService,
    UserService,
    JwtServiceAdapter,
  ],
  controllers: [AuthController],
  exports: [PassportModule]
})
export class AuthModule { }