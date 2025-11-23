import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { ROLES, ROLES_KEY } from '../../common/constants'

const ROLE_HIERARCHY: Record<ROLES, number> = {
  [ROLES.BASIC]: 1,
  [ROLES.ADVANCED]: 2,
  [ROLES.MANAGER]: 3,
  [ROLES.ADMIN]: 4,
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ROLES[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request & { roleUser?: ROLES }>()
    const userRole = request.roleUser

    if (!userRole) {
      throw new UnauthorizedException('Rol no definido en el usuario')
    }

    if (requiredRoles.includes(userRole)) {
      return true
    }

    const userLevel = ROLE_HIERARCHY[userRole]
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((role) => ROLE_HIERARCHY[role]),
    )

    if (userLevel >= minRequiredLevel) {
      return true
    }

    throw new UnauthorizedException('No tienes permisos para acceder a esta ruta')
  }
}
