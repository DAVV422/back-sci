import * as jwt from 'jsonwebtoken';

import { IUserToken } from '../../auth/interfaces/userToken.interface';

/** Claim `typ` de los tokens que emite `JwtServiceAdapter`. */
export const ACCESS_TOKEN_TYPE = 'access';
export const REFRESH_TOKEN_TYPE = 'refresh';

/** Mismo valor por defecto que `config/app.config.ts`; en producción `assertProductionConfig` exige uno real. */
export const accessTokenSecret = (): string => process.env.JWT_AUTH || 'secret';

/**
 * Verifica un token de acceso: firma (HS256 con JWT_AUTH), expiración y que no sea un refresh
 * token. Antes el guard solo hacía `jwt.decode`, sin verificar la firma: cualquiera podía
 * fabricar un token con el `sub` de otro usuario. Devuelve el motivo del rechazo como texto.
 */
export const verifyAccessToken = (token: string, secret: string = accessTokenSecret()): IUserToken | string => {
  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return 'Token no valido.';
    payload = decoded;
  } catch (error) {
    return error instanceof jwt.TokenExpiredError ? 'Token expirado' : 'Token no valido.';
  }
  // Los refresh tokens llevan `typ: 'refresh'` (y los anteriores a este cambio, un `jti`).
  if (payload.typ === REFRESH_TOKEN_TYPE || payload.jti || !payload.sub) return 'Token no valido.';
  const timeRemaining = payload.exp ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000)) : 0;
  return { role: payload.role, sub: String(payload.sub), time: timeRemaining, isExpired: false };
};
