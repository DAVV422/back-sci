import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ITokenStrategy } from './token-strategy';
import { IUserToken } from '../interfaces/userToken.interface';
import * as jwt from 'jsonwebtoken';
import { JwtStrategy } from './implementacion/jwt.strategy';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenValidatorService {
  constructor(
    private readonly strategy: JwtStrategy,
    private readonly jwtService: JwtService,
  ) {}

  async validateToken(token: string): Promise<IUserToken> {
    const payload = this.jwtService.verify(token);
    return this.strategy.validate(payload); // reutiliza la lógica
  }
}
