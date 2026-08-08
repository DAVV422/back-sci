import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JwtServiceAdapter {
  constructor(private readonly configService: ConfigService) {}

  signToken(payload: jwt.JwtPayload): string {
    return jwt.sign(payload, this.configService.get('JWT_AUTH'), {
      expiresIn: this.configService.get('JWT_EXPIRATION'),
    });
  }

  signRefreshToken(payload: jwt.JwtPayload): string {
    return jwt.sign(
      { ...payload, jti: uuidv4() },
      this.configService.get('JWT_AUTH'),
      {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
      },
    );
  }

  verifyToken(token: string): string | jwt.JwtPayload {
    return jwt.verify(token, this.configService.get('JWT_AUTH'));
  }
}
