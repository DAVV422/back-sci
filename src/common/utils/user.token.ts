import * as jwt from 'jsonwebtoken';

import { IAuthTokenResult } from '../../auth/interfaces/auth.interface';
import { IUserToken } from '../../auth/interfaces/userToken.interface';

export const userToken = (token: string): IUserToken | string => {
  try {
    const decode = jwt.decode(token) as IAuthTokenResult;
    const currentDate = new Date();
    const expiresDate = new Date(decode.exp * 1000);

    const isExpired = +expiresDate <= +currentDate;
    const timeRemaining = Math.max(0, Math.floor((expiresDate.getTime() - currentDate.getTime()) / 1000));

    return {
      role: decode.role,
      sub: decode.sub,
      time: timeRemaining,
      isExpired,
    };
  } catch (error) {
    return 'Token no valido.';
  }
};