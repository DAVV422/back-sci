import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID, createHash } from 'node:crypto';

import { AuthTokenEntity, AuthTokenType } from '../entities/auth-token.entity';
import { UserEntity } from '../../user/entities/user.entity';

@Injectable()
export class AuthTokenService {
  private readonly logger = new Logger('AuthTokenService');

  constructor(
    @InjectRepository(AuthTokenEntity)
    private readonly authTokenRepository: Repository<AuthTokenEntity>,
  ) {}

  async createToken(
    user: UserEntity,
    type: AuthTokenType,
    expiryHours: number,
  ): Promise<string> {
    this.logger.log(`[createToken] Generando token de tipo ${type} para el usuario id=${user.id}`);
    
    // Revocar tokens anteriores no usados de este tipo para el usuario
    await this.revokeUnusedTokens(user.id, type);

    const rawToken = randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const authToken = this.authTokenRepository.create({
      user,
      tokenHash,
      type,
      expiresAt,
      isUsed: false,
    });

    await this.authTokenRepository.save(authToken);
    this.logger.log(`[createToken] Token ${type} guardado exitosamente. Expiración=${expiresAt.toISOString()}`);
    return rawToken;
  }

  async validateToken(
    rawToken: string,
    type: AuthTokenType,
  ): Promise<AuthTokenEntity> {
    this.logger.log(`[validateToken] Validando token de tipo ${type}`);
    const tokenHash = this.hashToken(rawToken);

    const authToken = await this.authTokenRepository.findOne({
      where: { tokenHash, type, isUsed: false },
      relations: ['user'],
    });

    if (!authToken) {
      this.logger.warn(`[validateToken] Token no encontrado o ya utilizado. type=${type}`);
      throw new BadRequestException('El token de activación es inválido o ya ha sido utilizado.');
    }

    if (authToken.expiresAt < new Date()) {
      this.logger.warn(`[validateToken] Token expirado. expiresAt=${authToken.expiresAt.toISOString()}`);
      throw new BadRequestException('El token de activación ha expirado. Solicita un nuevo correo de activación.');
    }

    this.logger.log(`[validateToken] Token válido para el usuario id=${authToken.user.id}`);
    return authToken;
  }

  async markAsUsed(authToken: AuthTokenEntity): Promise<void> {
    this.logger.log(`[markAsUsed] Marcando token id=${authToken.id} como utilizado.`);
    authToken.isUsed = true;
    await this.authTokenRepository.save(authToken);
  }

  private async revokeUnusedTokens(userId: string, type: AuthTokenType): Promise<void> {
    await this.authTokenRepository.update(
      { user: { id: userId }, type, isUsed: false },
      { isUsed: true },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
