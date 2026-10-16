import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { JwtServiceAdapter } from './jwt.service';
import { TokenValidatorService } from './token-validator.service';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { AuthTokenType } from '../entities/auth-token.entity';
import { UserService } from '../../user/services/user.service';
import { EmailService } from '../../common/services/email.service';

describe('AuthService - recuperación de contraseña', () => {
  let service: AuthService;
  let userService: { findByEmail: jest.Mock; update: jest.Mock };
  let tokens: { createToken: jest.Mock; validateToken: jest.Mock; markAsUsed: jest.Mock };
  let email: { sendPasswordRecoveryEmail: jest.Mock };
  let revoke: { set: jest.Mock; where: jest.Mock; execute: jest.Mock };

  const activeUser = { id: 'u-1', email: 'marta@sci.bo', name: 'Marta', lastName: 'Rojas', isActive: true, isDeleted: false };
  const GENERIC = 'Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña.';

  beforeEach(async () => {
    userService = { findByEmail: jest.fn(), update: jest.fn().mockResolvedValue({}) };
    tokens = { createToken: jest.fn().mockResolvedValue('raw-token'), validateToken: jest.fn(), markAsUsed: jest.fn() };
    email = { sendPasswordRecoveryEmail: jest.fn().mockResolvedValue(undefined) };
    revoke = { set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({}) };
    const refreshRepo = { createQueryBuilder: jest.fn(() => ({ update: jest.fn().mockReturnValue(revoke) })) };
    const config = { get: jest.fn((k: string) => ({ FRONTEND_URL: 'https://sci.bo', RECOVERY_TOKEN_EXPIRY_HOURS: '1' } as any)[k]) };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: TokenValidatorService, useValue: {} },
        { provide: JwtServiceAdapter, useValue: {} },
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: refreshRepo },
        { provide: AuthTokenService, useValue: tokens },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('cuenta activa: crea un token de 1 h y envía el enlace a la pantalla de recuperación', async () => {
    userService.findByEmail.mockResolvedValue(activeUser);

    await expect(service.requestPasswordReset(' marta@sci.bo ')).resolves.toEqual({ message: GENERIC });

    expect(userService.findByEmail).toHaveBeenCalledWith('marta@sci.bo');
    expect(tokens.createToken).toHaveBeenCalledWith(activeUser, AuthTokenType.PASSWORD_RECOVERY, 1);
    expect(email.sendPasswordRecoveryEmail).toHaveBeenCalledWith(
      'marta@sci.bo', 'Marta Rojas', 'https://sci.bo/recover-password?token=raw-token',
    );
  });

  it.each([
    ['inexistente', () => Promise.reject(new NotFoundException())],
    ['inactiva', () => Promise.resolve({ ...activeUser, isActive: false })],
    ['eliminada', () => Promise.resolve({ ...activeUser, isDeleted: true })],
  ])('cuenta %s: misma respuesta y ningún correo (no se revela qué correos existen)', async (_case, lookup) => {
    userService.findByEmail.mockImplementation(lookup);

    await expect(service.requestPasswordReset('otro@sci.bo')).resolves.toEqual({ message: GENERIC });
    expect(tokens.createToken).not.toHaveBeenCalled();
    expect(email.sendPasswordRecoveryEmail).not.toHaveBeenCalled();
  });

  it('si el correo falla, la respuesta no cambia', async () => {
    userService.findByEmail.mockResolvedValue(activeUser);
    email.sendPasswordRecoveryEmail.mockRejectedValue(new Error('SMTP caído'));
    await expect(service.requestPasswordReset('marta@sci.bo')).resolves.toEqual({ message: GENERIC });
  });

  it('con un token válido cambia la contraseña, lo marca usado y revoca las sesiones', async () => {
    const authToken = { user: activeUser };
    tokens.validateToken.mockResolvedValue(authToken);

    await service.resetPassword('raw-token', 'NuevaClave123');

    expect(tokens.validateToken).toHaveBeenCalledWith('raw-token', AuthTokenType.PASSWORD_RECOVERY);
    expect(userService.update).toHaveBeenCalledWith('u-1', { password: 'NuevaClave123' });
    expect(tokens.markAsUsed).toHaveBeenCalledWith(authToken);
    expect(revoke.set).toHaveBeenCalledWith({ isRevoked: true });
    expect(revoke.where).toHaveBeenCalledWith(expect.stringContaining('user_id = :userId'), { userId: 'u-1' });
  });

  it('un token inválido o vencido no cambia nada', async () => {
    tokens.validateToken.mockRejectedValue(new UnauthorizedException('Token inválido o expirado.'));
    await expect(service.resetPassword('x', 'NuevaClave123')).rejects.toThrow();
    expect(userService.update).not.toHaveBeenCalled();
  });
});
