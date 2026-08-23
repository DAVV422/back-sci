import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenValidator: TokenValidatorService,
    private readonly jwtService: JwtServiceAdapter,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
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

  async recoverPassword(email: string): Promise<{ accessToken: string }> {
    this.logger.log(`[recoverPassword] Solicitud de recuperación de contraseña. email=${email}`);
    const user = await this.userService.findByEmail(email);
    const payload = this.getPayload(user);
    const accessToken = this.jwtService.signToken(payload);
    this.logger.log(`[recoverPassword] Token de recuperación generado. userId=${user.id}`);
    return { accessToken };
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
