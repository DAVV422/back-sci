import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserService } from './user.service';
import { UserEntity } from '../entities/user.entity';
import { QueryDto } from '../../common/dto/query.dto';
import { EmailService } from '../../common/services/email.service';
import { AuthTokenService } from '../../auth/services/auth-token.service';
import { ConfigService } from '@nestjs/config';

describe('UserService - whitelist QueryDto.attr', () => {
  let service: UserService;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: { sendActivationEmail: jest.fn(), sendPasswordRecoveryEmail: jest.fn() } },
        { provide: AuthTokenService, useValue: { createToken: jest.fn().mockResolvedValue('token-123'), validateToken: jest.fn(), markAsUsed: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('72') } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('rejects attr not in the user whitelist with BadRequestException', async () => {
    const queryDto: QueryDto = { attr: 'password', value: 'x' } as any;
    await expect(service.findAll(queryDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
  });

  it('runs without error for a valid attr in the user whitelist', async () => {
    const queryDto: QueryDto = { attr: 'name', value: 'juan' } as any;
    await expect(service.findAll(queryDto)).resolves.toEqual({
      items: [],
      total: 0,
    });
  });

  it('applies the SUADMIN exclusion on every query', async () => {
    const queryDto: QueryDto = {} as any;
    await service.findAll(queryDto);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.role != :suadminRole',
      { suadminRole: 'suadmin' },
    );
  });

  it('applies the SUADMIN exclusion together with attr/value filters', async () => {
    const queryDto: QueryDto = { attr: 'name', value: 'juan' } as any;
    await service.findAll(queryDto);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.name ILIKE :value',
      {
        value: '%juan%',
      },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.role != :suadminRole',
      { suadminRole: 'suadmin' },
    );
  });

  it('excludes ADMIN users from the returned items', async () => {
    const users = [
      { id: '1', name: 'Admin', role: 'admin' },
      { id: '2', name: 'Juan', role: 'basic' },
      { id: '3', name: 'Maria', role: 'manager' },
    ];
    queryBuilder.getManyAndCount.mockResolvedValue([users, users.length]);
    const result = await service.findAll({} as any);
    expect(result.total).toBe(3);
    expect(result.items.map((u) => u.role)).toEqual([
      'admin',
      'basic',
      'manager',
    ]);
  });
});

describe('UserService - findOne/findByEmail (admin direct access)', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: { sendActivationEmail: jest.fn(), sendPasswordRecoveryEmail: jest.fn() } },
        { provide: AuthTokenService, useValue: { createToken: jest.fn().mockResolvedValue('token-123'), validateToken: jest.fn(), markAsUsed: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('72') } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('findOne(adminId) returns the ADMIN user', async () => {
    const admin = { id: 'admin-id', role: 'admin', name: 'SysAdmin' };
    mockRepo.findOne.mockResolvedValue(admin);
    const result = await service.findOne('admin-id');
    expect(result).toEqual(admin);
  });

  it('findByEmail returns the ADMIN user by email', async () => {
    const admin = { id: 'admin-id', role: 'admin', email: 'admin@x.com' };
    mockRepo.findOne.mockResolvedValue(admin);
    const result = await service.findByEmail('admin@x.com');
    expect(result).toEqual(admin);
  });

  it('findOne throws NotFoundException when the user does not exist', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

describe('UserService - updateStatus', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: { sendActivationEmail: jest.fn(), sendPasswordRecoveryEmail: jest.fn() } },
        { provide: AuthTokenService, useValue: { createToken: jest.fn().mockResolvedValue('token-123'), validateToken: jest.fn(), markAsUsed: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('72') } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('changes isActive to false and returns the updated user', async () => {
    const user = { id: 'uuid', name: 'John', isActive: true } as UserEntity;
    const updated = { ...user, isActive: false } as UserEntity;
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateStatus('uuid', { isActive: false });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', {
      isActive: false,
    });
    expect(result.isActive).toBe(false);
  });

  it('changes isActive to true', async () => {
    const user = { id: 'uuid', name: 'John', isActive: false } as UserEntity;
    const updated = { ...user, isActive: true } as UserEntity;
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateStatus('uuid', { isActive: true });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', { isActive: true });
    expect(result.isActive).toBe(true);
  });

  it('throws BadRequestException when the update affects 0 rows', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'uuid' } as UserEntity);
    mockRepo.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.updateStatus('uuid', { isActive: false }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('UserService - updateProfile', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: { sendActivationEmail: jest.fn(), sendPasswordRecoveryEmail: jest.fn() } },
        { provide: AuthTokenService, useValue: { createToken: jest.fn().mockResolvedValue('token-123'), validateToken: jest.fn(), markAsUsed: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('72') } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('only updates the editable fields passed in the DTO', async () => {
    const user = {
      id: 'uuid',
      name: 'John',
      lastName: 'Doe',
      role: 'basic',
    } as UserEntity;
    jest.spyOn(service, 'findOne').mockResolvedValue(user);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    await service.updateProfile('uuid', {
      name: 'Nuevo',
      cellphone: '67303349',
    } as any);

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', {
      name: 'Nuevo',
      cellphone: '67303349',
    });
  });

  it('never passes role, email, password or is_active to the repository', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'uuid' } as UserEntity);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    await service.updateProfile('uuid', {
      name: 'Nuevo',
      role: 'ADMIN',
      email: 'hack@x.com',
      password: '123456',
      is_active: false,
    } as any);

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', {
      name: 'Nuevo',
    });
  });

  it('throws BadRequestException when the update affects 0 rows', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'uuid' } as UserEntity);
    mockRepo.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.updateProfile('uuid', { name: 'Nuevo' } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
