import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { UserService } from '../../user/services/user.service';
import { verifyAccessToken } from '../../common/utils/user.token';
import { IUserToken } from '../interfaces/userToken.interface';
import { PASSWORD_CHANGE_PENDING_KEY, PUBLIC_KEY } from '../../common/constants';

/** Código que la web reconoce para llevar a la pantalla de cambio obligatorio. */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>(PUBLIC_KEY, context.getHandler());
    if (isPublic) {
      return true;
    }

    const request: any = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token || Array.isArray(token))
      throw new UnauthorizedException('Token no encontrado');
    // Firma, expiración y tipo verificados (no solo decodificados).
    const managerToken: IUserToken | string = verifyAccessToken(token);
    if (typeof managerToken === 'string')
      throw new UnauthorizedException(managerToken);
    try {
      const user = await this.userService.findOneAuth(managerToken.sub);
      request.idUser = user.id;
      request.roleUser = user.role;
      request.user = { id: user.id, role: user.role };

      // Mientras la contraseña la siga conociendo quien creó la cuenta, el sistema queda cerrado
      // salvo para cambiarla. Se comprueba aquí y no solo en la web: si no, bastaría con usar la
      // API para saltarse la pantalla y seguir trabajando con esa contraseña.
      if (user.mustChangePassword) {
        const permitida = this.reflector.get<boolean>(
          PASSWORD_CHANGE_PENDING_KEY,
          context.getHandler(),
        );
        if (!permitida) {
          throw new ForbiddenException({
            message: 'Debes cambiar tu contraseña antes de usar el sistema.',
            error: PASSWORD_CHANGE_REQUIRED,
          });
        }
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error interno al validar el token',
      );
    }
  }
}
