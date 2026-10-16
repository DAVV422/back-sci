import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE } from '../../common/utils/user.token';

@Injectable()
export class JwtServiceAdapter {
  constructor(private readonly configService: ConfigService) {}

  /** Token de acceso. Sin JWT_EXPIRATION duraba para siempre (no llevaba `exp`): ahora 8 h por defecto. */
  signToken(payload: jwt.JwtPayload): string {
    return jwt.sign({ ...payload, typ: ACCESS_TOKEN_TYPE }, this.configService.get('JWT_AUTH'), {
      algorithm: 'HS256',
      expiresIn: this.configService.get('JWT_EXPIRATION') || '8h',
    });
  }

  /** Refresh token: `typ: 'refresh'` y, si está definida, una clave propia (JWT_REFRESH_SECRET). */
  signRefreshToken(payload: jwt.JwtPayload): string {
    return jwt.sign(
      { ...payload, typ: REFRESH_TOKEN_TYPE, jti: uuidv4() },
      this.refreshSecret(),
      {
        algorithm: 'HS256',
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
      },
    );
  }

  /** Verifica un refresh token (solo se usa en `/refresh-token`; el hash además se compara en la base). */
  verifyToken(token: string): string | jwt.JwtPayload {
    const payload = jwt.verify(token, this.refreshSecret(), { algorithms: ['HS256'] });
    if (typeof payload === 'string' || (payload.typ && payload.typ !== REFRESH_TOKEN_TYPE)) {
      throw new jwt.JsonWebTokenError('No es un refresh token.');
    }
    return payload;
  }

  private refreshSecret(): string {
    return this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_AUTH');
  }
}
