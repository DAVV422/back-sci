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

@Global()
@Module({
  imports: [UserModule, ConfigModule],
  providers: [
    {
      provide: 'ITokenStrategy',
      useClass: JwtStrategy, // Estrategia en uso para la validacion del token
    },
    {
      provide: TokenValidatorService,
      useFactory: (strategy: ITokenStrategy) => new TokenValidatorService(strategy),
      inject: ['ITokenStrategy'],
    },
    AuthService,
    UserService,
    JwtServiceAdapter,
  ],
  controllers: [AuthController],
})
export class AuthModule { }