import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtServiceAdapter {
  constructor(private readonly configService: ConfigService) {}

  signToken(payload: jwt.JwtPayload): string {
    return jwt.sign(payload, this.configService.get('JWT_AUTH'), { expiresIn: this.configService.get('JWT_EXPIRATION')});
  }
}
