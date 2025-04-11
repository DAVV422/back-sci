import { Injectable } from "@nestjs/common";
import { ITokenStrategy } from "./token-strategy";
import { IUserToken } from "../interfaces/userToken.interface";

@Injectable()
export class TokenValidatorService {
  constructor(private readonly strategy: ITokenStrategy) {}

  validateToken(token: string): Promise<IUserToken | false> {
    return this.strategy.validate(token);
  }
}
