import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IUserToken } from '../../interfaces/userToken.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_AUTH,
    });
  }

  async validate(payload: IUserToken): Promise<IUserToken> {
    if (!payload || payload.isExpired) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return payload;
  }
}
