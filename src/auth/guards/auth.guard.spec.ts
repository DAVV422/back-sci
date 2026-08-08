import {
  ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

import { AuthGuard } from './auth.guard';

describe('AuthGuard - error handling específico (F1-022)', () => {
  let guard: AuthGuard;
  let mockUserService: any;

  const buildContext = (
    headers: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext);

  const validToken = jwt.sign({ sub: 'user-1', role: 'basic' }, 'secret', {
    expiresIn: '1h',
  });
  const expiredToken = jwt.sign({ sub: 'user-1', role: 'basic' }, 'secret', {
    expiresIn: '-1h',
  });

  beforeEach(async () => {
    mockUserService = { findOneAuth: jest.fn() };
    guard = new AuthGuard(mockUserService, new Reflector());
  });

  it('request sin Authorization → UnauthorizedException "Token no encontrado"', async () => {
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      'Token no encontrado',
    );
    expect(mockUserService.findOneAuth).not.toHaveBeenCalled();
  });

  it('token expirado → UnauthorizedException "Token expirado"', async () => {
    const context = buildContext({
      authorization: `Bearer ${expiredToken}`,
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow('Token expirado');
  });

  it('token inválido → UnauthorizedException (no 500)', async () => {
    const context = buildContext({ authorization: 'Bearer not-a-jwt' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('usuario del token no existe → re-propaga UnauthorizedException original', async () => {
    mockUserService.findOneAuth.mockRejectedValue(
      new UnauthorizedException('Usuario asociado al token no encontrado.'),
    );
    const context = buildContext({
      authorization: `Bearer ${validToken}`,
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Usuario asociado al token no encontrado.',
    );
  });

  it('error inesperado de DB → InternalServerErrorException (500)', async () => {
    mockUserService.findOneAuth.mockRejectedValue(new Error('db down'));
    const context = buildContext({
      authorization: `Bearer ${validToken}`,
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      InternalServerErrorException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Error interno al validar el token',
    );
  });

  it('token válido y usuario existente → permite el acceso y adjunta el usuario', async () => {
    const user = { id: 'user-1', role: 'basic' };
    mockUserService.findOneAuth.mockResolvedValue(user);
    const request: any = { headers: { authorization: `Bearer ${validToken}` } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.idUser).toBe('user-1');
    expect(request.roleUser).toBe('basic');
    expect(request.user).toEqual({ id: 'user-1', role: 'basic' });
  });
});
