import { Injectable } from '@nestjs/common';
import { ITokenStrategy } from '../token-strategy';
import { userToken } from '../../../common/utils/user.token';
import { IUserToken } from '../../interfaces/userToken.interface';

@Injectable()
export class JwtStrategy implements ITokenStrategy {
  async validate(token: string): Promise<IUserToken | false> {
    const result = userToken(token);
    if (typeof result === 'string' || result.isExpired) return false;
    return result;
  }
}
