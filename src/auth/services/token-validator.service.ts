import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ITokenStrategy } from "./token-strategy";
import { IUserToken } from "../interfaces/userToken.interface";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TokenValidatorService {
  constructor(private readonly strategy: ITokenStrategy) {}

  async validateToken(token: string): Promise<IUserToken> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as IUserToken;
    return decoded;
  } catch (error) {
    throw new UnauthorizedException('Token inválido o expirado');
  }
}
}
