import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

import { AuthGuard, PASSWORD_CHANGE_REQUIRED } from './auth.guard';
import { PASSWORD_CHANGE_PENDING_KEY } from '../../common/constants';

describe('AuthGuard - error handling específico (F1-022)', () => {
  let guard: AuthGuard;
  let mockUserService: any;

  const buildContext = (
    headers: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      getHandler: () => () => undefined,
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

  const originalSecret = process.env.JWT_AUTH;
  beforeAll(() => (process.env.JWT_AUTH = 'secret'));
  afterAll(() => (process.env.JWT_AUTH = originalSecret));

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

  describe('verificación de la firma (P1 #13)', () => {
    const forged = (claims: object, secret = 'otra-clave') => jwt.sign(claims, secret, { expiresIn: '1h' });

    it.each([
      ['firmado con otra clave', forged({ sub: 'admin-1', role: 'suadmin' })],
      ['sin firma (alg none)', jwt.sign({ sub: 'admin-1', role: 'suadmin' }, '', { algorithm: 'none' })],
      ['un refresh token', forged({ sub: 'user-1', role: 'basic', typ: 'refresh' }, 'secret')],
      ['un refresh token anterior (con jti)', forged({ sub: 'user-1', role: 'basic', jti: 'abc' }, 'secret')],
      ['sin sub', forged({ role: 'basic' }, 'secret')],
    ])('rechaza un token %s sin consultar al usuario', async (_case, token) => {
      await expect(guard.canActivate(buildContext({ authorization: `Bearer ${token}` }))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.findOneAuth).not.toHaveBeenCalled();
    });
  });

  it('token válido y usuario existente → permite el acceso y adjunta el usuario', async () => {
    const user = { id: 'user-1', role: 'basic' };
    mockUserService.findOneAuth.mockResolvedValue(user);
    const request: any = { headers: { authorization: `Bearer ${validToken}` } };
    const context = {
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.idUser).toBe('user-1');
    expect(request.roleUser).toBe('basic');
    expect(request.user).toEqual({ id: 'user-1', role: 'basic' });
  });
});

describe('AuthGuard - cambio de contraseña obligatorio', () => {
  let guard: AuthGuard;
  let mockUserService: any;
  let reflector: Reflector;

  const token = jwt.sign({ sub: 'user-1', role: 'basic' }, 'secret', { expiresIn: '1h' });
  const contexto = (): ExecutionContext =>
    ({
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: `Bearer ${token}` } }) }),
    } as unknown as ExecutionContext);

  const originalSecret = process.env.JWT_AUTH;
  beforeAll(() => (process.env.JWT_AUTH = 'secret'));
  afterAll(() => (process.env.JWT_AUTH = originalSecret));

  beforeEach(() => {
    mockUserService = { findOneAuth: jest.fn() };
    reflector = new Reflector();
    guard = new AuthGuard(mockUserService, reflector);
  });

  const conMarca = (mustChangePassword: boolean) =>
    mockUserService.findOneAuth.mockResolvedValue({ id: 'user-1', role: 'basic', mustChangePassword });

  it('sin la marca, deja pasar con normalidad', async () => {
    conMarca(false);
    await expect(guard.canActivate(contexto())).resolves.toBe(true);
  });

  // Sin este bloqueo bastaría usar la API para saltarse la pantalla y seguir trabajando con la
  // contraseña que conoce quien creó la cuenta.
  it('con la marca, bloquea cualquier ruta no exenta', async () => {
    conMarca(true);
    await expect(guard.canActivate(contexto())).rejects.toThrow(ForbiddenException);
  });

  it('el error lleva un código que la web reconoce para redirigir', async () => {
    conMarca(true);
    try {
      await guard.canActivate(contexto());
      fail('debía bloquear');
    } catch (e: any) {
      expect(e.getResponse().error).toBe(PASSWORD_CHANGE_REQUIRED);
    }
  });

  it('deja pasar las rutas marcadas como permitidas durante el bloqueo', async () => {
    conMarca(true);
    jest.spyOn(reflector, 'get').mockImplementation((clave: any) =>
      clave === PASSWORD_CHANGE_PENDING_KEY ? true : undefined,
    );
    await expect(guard.canActivate(contexto())).resolves.toBe(true);
  });
});
