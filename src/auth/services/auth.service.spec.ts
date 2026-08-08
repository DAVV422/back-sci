import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import * as jwt from 'jsonwebtoken';

import { AuthService } from './auth.service';
import { TokenValidatorService } from './token-validator.service';
import { JwtServiceAdapter } from './jwt.service';
import { UserService } from '../../user/services/user.service';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { ROLES } from '../../common/constants';

describe('AuthService - refreshToken', () => {
  let service: AuthService;
  let mockUserService: any;
  let mockJwtService: any;
  let mockRefreshRepo: any;
  let refreshToken: string;
  let storedHash: string;

  beforeEach(async () => {
    (process.env.HASH_SALT as any) = '10';
    refreshToken = jwt.sign(
      { sub: 'user-id', role: ROLES.BASIC },
      'test-secret',
      { expiresIn: '1h' },
    );
    storedHash = createHash('sha256').update(refreshToken).digest('hex');

    mockUserService = {
      findByEmail: jest.fn(),
      findOne: jest.fn(),
    };
    mockJwtService = {
      signToken: jest.fn().mockReturnValue('new-access-token'),
      signRefreshToken: jest.fn().mockReturnValue(
        jwt.sign({ sub: 'user-id', role: ROLES.BASIC }, 'test-secret', {
          expiresIn: '1h',
        }),
      ),
      verifyToken: jest.fn(),
    };
    mockRefreshRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockImplementation((data) => data),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: TokenValidatorService, useValue: {} },
        { provide: JwtServiceAdapter, useValue: mockJwtService },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockRefreshRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('returns new tokens and revokes the previous one when valid', async () => {
    mockJwtService.verifyToken.mockReturnValue({
      sub: 'user-id',
      role: ROLES.BASIC,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    mockRefreshRepo.findOne.mockResolvedValue({
      userId: 'user-id',
      tokenHash: storedHash,
      isRevoked: false,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });
    mockUserService.findOne.mockResolvedValue({
      id: 'user-id',
      role: ROLES.BASIC,
    } as UserEntity);

    const result = await service.refreshToken(refreshToken);

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBeTruthy();
    expect(jwt.decode(result.refreshToken)).toHaveProperty('sub', 'user-id');
    expect(mockRefreshRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ isRevoked: true }),
    );
  });

  it('throws UnauthorizedException when the token was revoked', async () => {
    mockJwtService.verifyToken.mockReturnValue({
      sub: 'user-id',
      role: ROLES.BASIC,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    mockRefreshRepo.findOne.mockResolvedValue(null);

    await expect(service.refreshToken(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the token is expired', async () => {
    mockJwtService.verifyToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(service.refreshToken(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the hash does not match', async () => {
    mockJwtService.verifyToken.mockReturnValue({
      sub: 'user-id',
      role: ROLES.BASIC,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    mockRefreshRepo.findOne.mockResolvedValue({
      userId: 'user-id',
      tokenHash: createHash('sha256').update('other-token').digest('hex'),
      isRevoked: false,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    await expect(service.refreshToken(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('persists a hash of the refresh token, never the plaintext', async () => {
    jest.spyOn(service as any, 'generateJWT').mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: {},
    });

    await (service as any).persistRefreshToken('user-id', refreshToken);

    const saved = mockRefreshRepo.save.mock.calls[0][0];
    expect(saved.tokenHash).not.toBe(refreshToken);
    expect(saved.tokenHash).toBeTruthy();
    expect(saved.userId).toBe('user-id');
    expect(saved.isRevoked).toBe(false);
    expect(saved.expiresAt).toBeInstanceOf(Date);
  });
});
