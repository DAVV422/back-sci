import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { UserService } from '../../user/services/user.service';
import { userToken } from '../../common/utils/user.token';
import { IUserToken } from '../interfaces/userToken.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const request: any = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token || Array.isArray(token))
      throw new UnauthorizedException('Token no encontrado');
    const managerToken: IUserToken | string = userToken(token);
    if (typeof managerToken === 'string')
      throw new UnauthorizedException(managerToken);
    if (managerToken.isExpired)
      throw new UnauthorizedException('Token expirado');
    try {
      const user = await this.userService.findOneAuth(managerToken.sub);
      request.idUser = user.id;
      request.roleUser = user.role;
      request.user = { id: user.id, role: user.role };
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
