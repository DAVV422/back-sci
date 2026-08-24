import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthTokenService } from './auth-token.service';
import { AuthTokenEntity, AuthTokenType } from '../entities/auth-token.entity';
import { UserEntity } from '../../user/entities/user.entity';

describe('AuthTokenService', () => {
  let service: AuthTokenService;
  let mockRepo: jest.Mocked<Partial<Repository<AuthTokenEntity>>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'token-uuid', ...entity })),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthTokenService,
        { provide: getRepositoryToken(AuthTokenEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AuthTokenService>(AuthTokenService);
  });

  it('should create an activation token and return raw UUID', async () => {
    const user = { id: 'user-1' } as UserEntity;
    const rawToken = await service.createToken(user, AuthTokenType.ACTIVATION, 72);

    expect(rawToken).toBeDefined();
    expect(typeof rawToken).toBe('string');
    expect(mockRepo.update).toHaveBeenCalledWith(
      { user: { id: 'user-1' }, type: AuthTokenType.ACTIVATION, isUsed: false },
      { isUsed: true },
    );
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should validate a valid raw token', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);

    const mockTokenEntity = {
      id: 'token-uuid',
      isUsed: false,
      expiresAt: futureDate,
      user: { id: 'user-1' },
    } as AuthTokenEntity;

    mockRepo.findOne.mockResolvedValue(mockTokenEntity);

    const result = await service.validateToken('raw-token-uuid', AuthTokenType.ACTIVATION);
    expect(result).toEqual(mockTokenEntity);
  });

  it('should throw BadRequestException if token is missing or used', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await expect(
      service.validateToken('invalid-token', AuthTokenType.ACTIVATION),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if token is expired', async () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 24);

    const mockTokenEntity = {
      id: 'token-uuid',
      isUsed: false,
      expiresAt: pastDate,
      user: { id: 'user-1' },
    } as AuthTokenEntity;

    mockRepo.findOne.mockResolvedValue(mockTokenEntity);

    await expect(
      service.validateToken('expired-token', AuthTokenType.ACTIVATION),
    ).rejects.toThrow(BadRequestException);
  });

  it('should mark a token as used', async () => {
    const tokenEntity = { id: 'token-uuid', isUsed: false } as AuthTokenEntity;
    await service.markAsUsed(tokenEntity);

    expect(tokenEntity.isUsed).toBe(true);
    expect(mockRepo.save).toHaveBeenCalledWith(tokenEntity);
  });
});
