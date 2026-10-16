import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import { UserEntity } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { IPayload } from '../interfaces/payload.interface';
import { ILoginResponse } from '../interfaces/login.interface';
import { handlerError } from '../../common/utils/handlerError.utils';
import { TokenValidatorService } from './token-validator.service';
import { JwtServiceAdapter } from './jwt.service';
import { UserDTO } from '../../user/dto/user.dto';
import { IUserToken } from '../interfaces/userToken.interface';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { AuthTokenService } from './auth-token.service';
import { AuthTokenType } from '../entities/auth-token.entity';
import { EmailService } from '../../common/services/email.service';
import { FRONTEND_ROUTES } from '../../common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenValidator: TokenValidatorService,
    private readonly jwtService: JwtServiceAdapter,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly authTokenService: AuthTokenService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<ILoginResponse> {
    this.logger.log(`[login] Intento de inicio de sesión. email=${email}`);
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        this.logger.warn(`[login] Fallo de autenticación: usuario no encontrado. email=${email}`);
        throw new NotFoundException('Usuario o contraseña incorrecta.');
      }
      if (user.isDeleted) {
        this.logger.warn(`[login] Fallo de autenticación: usuario desactivado/eliminado. userId=${user.id}`);
        throw new NotFoundException('Ocurrió un problema.');
      }
      if (!user.isActive) {
        this.logger.warn(`[login] Fallo de autenticación: usuario inactivo (cuenta no activada). userId=${user.id}`);
        throw new UnauthorizedException(
          'Tu cuenta no ha sido activada. Por favor revisa tu correo electrónico para activarla.',
        );
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        this.logger.warn(`[login] Contraseña incorrecta. email=${email}`);
        throw new NotFoundException('Usuario o contraseña incorrecta.');
      }

      const result = await this.generateJWT(user);
      this.logger.log(`[login] Inicio de sesión exitoso. userId=${user.id}, role=${user.role}`);
      return result;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async activateAccount(token: string, newPassword: string): Promise<{ message: string }> {
    this.logger.log(`[activateAccount] Procesando activación de cuenta con token.`);
    try {
      const authToken = await this.authTokenService.validateToken(
        token,
        AuthTokenType.ACTIVATION,
      );

      const user = authToken.user;

      await this.userService.update(user.id, {
        password: newPassword,
        isActive: true,
      } as any);

      await this.authTokenService.markAsUsed(authToken);

      this.logger.log(`[activateAccount] Cuenta activada con éxito. userId=${user.id}, email=${user.email}`);
      return { message: 'Cuenta activada exitosamente. Ya puedes iniciar sesión.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async resendActivationEmail(email: string): Promise<{ message: string }> {
    this.logger.log(`[resendActivationEmail] Solicitud de reenvío de correo de activación. email=${email}`);
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        this.logger.warn(`[resendActivationEmail] Usuario no encontrado. email=${email}`);
        throw new NotFoundException('Usuario no encontrado.');
      }

      if (user.isActive) {
        this.logger.warn(`[resendActivationEmail] La cuenta ya está activa. userId=${user.id}`);
        throw new BadRequestException('La cuenta de usuario ya se encuentra activa.');
      }

      const expiryHours = Number(this.configService.get<number>('ACTIVATION_TOKEN_EXPIRY_HOURS')) || 72;
      const rawToken = await this.authTokenService.createToken(
        user,
        AuthTokenType.ACTIVATION,
        expiryHours,
      );

      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
      const activationUrl = `${frontendUrl}${FRONTEND_ROUTES.ACTIVATE_ACCOUNT}?token=${rawToken}`;

      await this.emailService.sendActivationEmail(
        user.email,
        `${user.name} ${user.lastName}`,
        activationUrl,
      );

      this.logger.log(`[resendActivationEmail] Correo de activación reenviado exitosamente a ${email}`);
      return { message: 'Correo de activación reenviado exitosamente.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async checkToken(token: string): Promise<IUserToken | false> {
    try {
      const userToken = await this.tokenValidator.validateToken(token);
      if (!userToken) return false;
      return userToken;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async expiredToken(token: string): Promise<boolean> {
    try {
      const userToken = await this.tokenValidator.validateToken(token);
      if (!userToken) return false;
      return userToken.isExpired;
    } catch (error) {
      handlerError(error, this.logger);
      return true;
    }
  }

  async generateJWT(user: UserEntity): Promise<ILoginResponse> {
    const payload = this.getPayload(user);
    const accessToken = this.jwtService.signToken(payload);
    const refreshToken = this.jwtService.signRefreshToken(payload);
    await this.persistRefreshToken(user.id, refreshToken);
    const userData = new UserDTO(user);
    return { accessToken, refreshToken, user: userData };
  }

  async refreshToken(refreshToken: string): Promise<ILoginResponse> {
    this.logger.log(`[refreshToken] Solicitud de renovación de token.`);
    try {
      const decoded = this.decodeRefreshToken(refreshToken);
      const stored = await this.refreshTokenRepository.findOne({
        where: { user: { id: decoded.sub }, isRevoked: false },
        order: { createdAt: 'DESC' },
      });
      if (!stored) {
        this.logger.warn(`[refreshToken] Refresh token no encontrado o revocado. userId=${decoded.sub}`);
        throw new UnauthorizedException('Refresh token no válido.');
      }
      const isValid = this.hashToken(refreshToken) === stored.tokenHash;
      if (!isValid) {
        this.logger.warn(`[refreshToken] Hash de refresh token no coincide. userId=${decoded.sub}`);
        throw new UnauthorizedException('Refresh token no válido.');
      }
      if (stored.expiresAt < new Date()) {
        this.logger.warn(`[refreshToken] Refresh token expirado. userId=${decoded.sub}`);
        throw new UnauthorizedException('Refresh token expirado.');
      }

      stored.isRevoked = true;
      await this.refreshTokenRepository.save(stored);

      const user = await this.userService.findOne(stored.userId || decoded.sub);
      const result = await this.generateJWT(user);
      this.logger.log(`[refreshToken] Token renovado exitosamente. userId=${user.id}`);
      return result;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /**
   * Paso 1 de la recuperación: si hay una cuenta activa con ese correo, envía un enlace de un solo
   * uso. La respuesta es siempre la misma (y el correo sale en segundo plano) para no revelar qué
   * correos están registrados. Reemplaza a un `recoverPassword` anterior que, sin exponerse,
   * entregaba un access token a quien supiera un correo.
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const message = 'Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña.';
    let user: UserEntity | null = null;
    try {
      user = await this.userService.findByEmail(email.trim());
    } catch {
      user = null;
    }
    if (!user || !user.isActive || user.isDeleted) {
      this.logger.warn(`[requestPasswordReset] Solicitud para un correo sin cuenta activa.`);
      return { message };
    }

    // RECOVERY_TOKEN_EXPIRY_HOURS (ya en .env.example); createToken trabaja en horas enteras.
    const expiryHours = Math.max(1, Math.round(Number(this.configService.get<number>('RECOVERY_TOKEN_EXPIRY_HOURS')) || 1));
    const rawToken = await this.authTokenService.createToken(user, AuthTokenType.PASSWORD_RECOVERY, expiryHours);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const recoveryUrl = `${frontendUrl}${FRONTEND_ROUTES.RECOVER_PASSWORD}?token=${rawToken}`;
    this.emailService
      .sendPasswordRecoveryEmail(user.email, `${user.name} ${user.lastName}`, recoveryUrl)
      .catch((error) => this.logger.error(`[requestPasswordReset] No se pudo enviar el correo: ${error?.message}`));
    this.logger.log(`[requestPasswordReset] Enlace de recuperación generado. userId=${user.id}`);
    return { message };
  }

  /** Paso 2: con el token del correo fija la nueva contraseña y cierra las sesiones abiertas. */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const authToken = await this.authTokenService.validateToken(token, AuthTokenType.PASSWORD_RECOVERY);
      const user = authToken.user;
      await this.userService.update(user.id, { password: newPassword } as any);
      await this.authTokenService.markAsUsed(authToken);
      await this.refreshTokenRepository
        .createQueryBuilder()
        .update(RefreshTokenEntity)
        .set({ isRevoked: true })
        .where('user_id = :userId AND is_revoked = false', { userId: user.id })
        .execute();
      this.logger.log(`[resetPassword] Contraseña restablecida y sesiones revocadas. userId=${user.id}`);
      return { message: 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  private getPayload(user: UserEntity): IPayload {
    return { sub: user.id, role: user.role };
  }

  private decodeRefreshToken(token: string): jwt.JwtPayload {
    try {
      return this.jwtService.verifyToken(token) as jwt.JwtPayload;
    } catch (error) {
      this.logger.warn(`[decodeRefreshToken] Error al decodificar token: ${error.message}`);
      throw new UnauthorizedException('Refresh token expirado o inválido.');
    }
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
    const expiresAt = new Date(decoded.exp * 1000);
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        user: { id: userId } as UserEntity,
        tokenHash,
        isRevoked: false,
        expiresAt,
      }),
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
