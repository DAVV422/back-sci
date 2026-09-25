import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserService } from './user.service';
import { UserEntity } from '../entities/user.entity';
import { QueryDto } from '../../common/dto/query.dto';
import { EmailService } from '../../common/services/email.service';
import { AuthTokenService } from '../../auth/services/auth-token.service';
import { ConfigService } from '@nestjs/config';
import { ROLES } from '../../common/constants';

const mockStorageService = {
  saveFile: jest.fn().mockResolvedValue('/api/user/image/profile_123.png'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getFilePath: jest.fn().mockReturnValue('data/uploads/profiles/profile_123.png'),
};

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
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
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
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
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

  it('findOne throws NotFoundException when non-SUADMIN attempts to query a SUADMIN user', async () => {
    const suadmin = { id: 'suadmin-id', role: 'suadmin', name: 'SuperAdmin' };
    mockRepo.findOne.mockResolvedValue(suadmin);
    await expect(service.findOne('suadmin-id', 'admin')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findOne returns SUADMIN user when caller is SUADMIN', async () => {
    const suadmin = { id: 'suadmin-id', role: 'suadmin', name: 'SuperAdmin' };
    mockRepo.findOne.mockResolvedValue(suadmin);
    const result = await service.findOne('suadmin-id', 'suadmin');
    expect(result).toEqual(suadmin);
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
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('changes isOperational to false and returns the updated user', async () => {
    const user = { id: 'uuid', name: 'John', isOperational: true } as UserEntity;
    const updated = { ...user, isOperational: false } as UserEntity;
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateStatus('uuid', { isOperational: false });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', {
      isOperational: false,
    });
    expect(result.isOperational).toBe(false);
  });

  it('changes isOperational to true', async () => {
    const user = { id: 'uuid', name: 'John', isOperational: false } as UserEntity;
    const updated = { ...user, isOperational: true } as UserEntity;
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateStatus('uuid', { isOperational: true });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', { isOperational: true });
    expect(result.isOperational).toBe(true);
  });

  it('maps legacy isActive to isOperational in updateStatus', async () => {
    const user = { id: 'uuid', name: 'John', isOperational: true } as UserEntity;
    const updated = { ...user, isOperational: false } as UserEntity;
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateStatus('uuid', { isActive: false });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', {
      isOperational: false,
    });
    expect(result.isOperational).toBe(false);
  });

  it('throws BadRequestException when the update affects 0 rows', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'uuid' } as UserEntity);
    mockRepo.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.updateStatus('uuid', { isOperational: false }),
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
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
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

describe('UserService - update (Admin / Suadmin restrictions)', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: {} },
        { provide: AuthTokenService, useValue: {} },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('10') },
        },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('only updates email, role, isActive, and isOperational; ignores name and lastName', async () => {
    const user = { id: 'uuid-1', role: ROLES.BASIC } as UserEntity;
    jest.spyOn(service, 'findOne').mockResolvedValue(user);

    await service.update(
      'uuid-1',
      {
        email: 'new@sci.local',
        role: ROLES.ADVANCED,
        isActive: true,
        isOperational: false,
        name: 'Ignored',
        lastName: 'Ignored',
      } as any,
      ROLES.ADMIN,
    );

    expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', {
      email: 'new@sci.local',
      role: ROLES.ADVANCED,
      isActive: true,
      isOperational: false,
    });
  });

  it('prevents non-SUADMIN from promoting to SUADMIN', async () => {
    const user = { id: 'uuid-1', role: ROLES.BASIC } as UserEntity;
    jest.spyOn(service, 'findOne').mockResolvedValue(user);

    await expect(
      service.update('uuid-1', { role: ROLES.SUADMIN }, ROLES.ADMIN),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prevents non-SUADMIN from updating a SUADMIN user', async () => {
    const user = { id: 'uuid-suadmin', role: ROLES.SUADMIN } as UserEntity;
    jest.spyOn(service, 'findOne').mockResolvedValue(user);

    await expect(
      service.update(
        'uuid-suadmin',
        { email: 'suadmin2@sci.local' },
        ROLES.ADMIN,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('UserService - createUser and REQUIRE_EMAIL_ACTIVATION', () => {
  let service: UserService;
  let mockRepo: any;
  let mockEmailService: any;
  let mockAuthTokenService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
    };
    mockEmailService = {
      sendActivationEmail: jest.fn().mockResolvedValue(true),
    };
    mockAuthTokenService = {
      createToken: jest.fn().mockResolvedValue('token-abc-123'),
    };
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ACTIVATION_TOKEN_EXPIRY_HOURS') return '72';
        if (key === 'FRONTEND_URL') return 'http://localhost:4200';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuthTokenService, useValue: mockAuthTokenService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('creates active user without sending email when REQUIRE_EMAIL_ACTIVATION is false or absent', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'REQUIRE_EMAIL_ACTIVATION') return 'false';
      return null;
    });

    const dto = {
      name: 'Carlos',
      lastName: 'Gomez',
      email: 'carlos@sci.local',
      role: ROLES.BASIC,
    };

    jest.spyOn(service, 'findOneBy').mockResolvedValue({
      id: 'uuid-1',
      ...dto,
      isActive: true,
    } as any);

    const result = await service.createUser(dto as any, ROLES.ADMIN);

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
    expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
    expect(result.isActive).toBe(true);
  });

  it('creates inactive user and sends activation email when REQUIRE_EMAIL_ACTIVATION is true', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'REQUIRE_EMAIL_ACTIVATION') return 'true';
      if (key === 'ACTIVATION_TOKEN_EXPIRY_HOURS') return '72';
      if (key === 'FRONTEND_URL') return 'http://localhost:4200';
      return null;
    });

    const dto = {
      name: 'Ana',
      lastName: 'Silva',
      email: 'ana@sci.local',
      role: ROLES.BASIC,
    };

    jest.spyOn(service, 'findOneBy').mockResolvedValue({
      id: 'uuid-2',
      ...dto,
      isActive: false,
    } as any);

    const result = await service.createUser(dto as any, ROLES.ADMIN);

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
    expect(mockAuthTokenService.createToken).toHaveBeenCalled();
    expect(mockEmailService.sendActivationEmail).toHaveBeenCalledWith(
      'ana@sci.local',
      'Ana Silva',
      expect.stringContaining('token=token-abc-123'),
    );
    expect(result.isActive).toBe(false);
  });

  it('prevents non-SUADMIN from creating a SUADMIN user', async () => {
    const dto = {
      name: 'Super',
      lastName: 'User',
      email: 'suadmin@sci.local',
      role: ROLES.SUADMIN,
    };

    await expect(service.createUser(dto as any, ROLES.ADMIN)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('UserService - bulkUpdateGrades', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: {} },
        { provide: AuthTokenService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('10') } },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('updates grade for multiple users when userIds and grade are provided (manager)', async () => {
    mockRepo.findOne.mockImplementation(({ where }: any) => {
      if (where.id === 'user-1') return Promise.resolve({ id: 'user-1', role: ROLES.BASIC, grade: 'Bombero' });
      if (where.id === 'user-2') return Promise.resolve({ id: 'user-2', role: ROLES.ADVANCED, grade: 'Bombero' });
      return Promise.resolve(null);
    });

    const result = await service.bulkUpdateGrades(
      { userIds: ['user-1', 'user-2'], grade: 'Teniente Segundo' },
      ROLES.MANAGER,
    );

    expect(result.summary).toEqual({ total: 2, successful: 2, failed: 0 });
    expect(mockRepo.update).toHaveBeenCalledWith('user-1', { grade: 'Teniente Segundo' });
    expect(mockRepo.update).toHaveBeenCalledWith('user-2', { grade: 'Teniente Segundo' });
  });

  it('handles partial failures (user not found or insufficient permissions) without aborting others', async () => {
    mockRepo.findOne.mockImplementation(({ where }: any) => {
      if (where.id === 'user-1') return Promise.resolve({ id: 'user-1', role: ROLES.BASIC, grade: 'Bombero' });
      if (where.id === 'user-suadmin') return Promise.resolve({ id: 'user-suadmin', role: ROLES.SUADMIN, grade: 'Comandante' });
      if (where.id === 'user-404') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await service.bulkUpdateGrades(
      {
        users: [
          { userId: 'user-1', grade: 'Teniente' },
          { userId: 'user-suadmin', grade: 'Director' },
          { userId: 'user-404', grade: 'Capitán' },
        ],
      },
      ROLES.ADMIN,
    );

    expect(result.summary).toEqual({ total: 3, successful: 1, failed: 2 });
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toContain('Super Administrador');
    expect(result.results[2].success).toBe(false);
    expect(result.results[2].error).toContain('no encontrado');
  });

  it('prevents manager from updating grade of admin or suadmin users', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'admin-1', role: ROLES.ADMIN, grade: 'Capitán' });

    const result = await service.bulkUpdateGrades(
      { userIds: ['admin-1'], grade: 'Comandante' },
      ROLES.MANAGER,
    );

    expect(result.summary).toEqual({ total: 1, successful: 0, failed: 1 });
    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain('Un manager solo puede modificar el grado institucional');
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});

describe('UserService - combined filters (findAll & findAllAdmin)', () => {
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
        { provide: EmailService, useValue: {} },
        { provide: AuthTokenService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('10') } },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('applies multiple combined filters simultaneously (name, role, isActive, isOperational, grade)', async () => {
    await service.findAll({
      name: 'Diego',
      role: ROLES.ADMIN,
      isActive: true,
      isOperational: false,
      grade: 'Capitán',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.name ILIKE :filterName', {
      filterName: '%Diego%',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :filterRole', {
      filterRole: 'admin',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :filterIsActive', {
      filterIsActive: true,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.isOperational = :filterIsOperational',
      { filterIsOperational: false },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.grade ILIKE :filterGrade', {
      filterGrade: '%Capitán%',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.is_deleted = false');
  });

  it('applies global search across name, lastName, and email', async () => {
    await service.findAll({
      search: 'silva',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(user.name ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
      { search: '%silva%' },
    );
  });

  it('allows combining global search with specific role and operational filters', async () => {
    await service.findAll({
      search: 'silva',
      role: ROLES.BASIC,
      isOperational: true,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(user.name ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
      { search: '%silva%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role = :filterRole', {
      filterRole: 'basic',
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'user.isOperational = :filterIsOperational',
      { filterIsOperational: true },
    );
  });
});

describe('UserService - image upload and fault tolerance', () => {
  let service: UserService;
  let mockRepo: any;
  let mockStorage: any;

  beforeEach(async () => {
    mockRepo = {
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };
    mockStorage = {
      saveFile: jest.fn().mockResolvedValue('/api/user/image/profile_123.png'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFilePath: jest.fn().mockReturnValue('data/uploads/profiles/profile_123.png'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: { sendActivationEmail: jest.fn() } },
        { provide: AuthTokenService, useValue: { createToken: jest.fn().mockResolvedValue('token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('false') } },
        { provide: 'STORAGE_SERVICE', useValue: mockStorage },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('stores image and assigns urlImage when file is provided on createUser', async () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('test'),
    } as any;

    jest.spyOn(service, 'findOneBy').mockResolvedValue({
      id: 'uuid-img-1',
      email: 'img@sci.local',
      urlImage: '/api/user/image/profile_123.png',
    } as any);

    await service.createUser(
      { email: 'img@sci.local', name: 'Img', lastName: 'User', role: ROLES.BASIC } as any,
      ROLES.ADMIN,
      mockFile,
    );

    expect(mockStorage.saveFile).toHaveBeenCalledWith(mockFile, 'profiles');
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ urlImage: '/api/user/image/profile_123.png' }),
    );
  });

  it('tolerates image upload failure on createUser by setting urlImage=null and continuing creation', async () => {
    mockStorage.saveFile.mockRejectedValue(new Error('Disk full error'));

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'broken.png',
      mimetype: 'image/png',
    } as any;

    jest.spyOn(service, 'findOneBy').mockResolvedValue({
      id: 'uuid-img-2',
      email: 'fault@sci.local',
      urlImage: null,
    } as any);

    const user = await service.createUser(
      { email: 'fault@sci.local', name: 'Fault', lastName: 'User', role: ROLES.BASIC } as any,
      ROLES.ADMIN,
      mockFile,
    );

    expect(mockStorage.saveFile).toHaveBeenCalledWith(mockFile, 'profiles');
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ urlImage: null }),
    );
    expect(user).toBeDefined();
  });

  it('updates profile image and cleans up old image file on updateProfile', async () => {
    const existingUser = {
      id: 'user-profile-id',
      urlImage: '/api/user/image/old_profile.png',
    } as UserEntity;
    jest.spyOn(service, 'findOne').mockResolvedValue(existingUser);

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'new_avatar.webp',
      mimetype: 'image/webp',
    } as any;

    await service.updateProfile('user-profile-id', { name: 'Updated' }, mockFile);

    expect(mockStorage.saveFile).toHaveBeenCalledWith(mockFile, 'profiles');
    expect(mockStorage.deleteFile).toHaveBeenCalledWith('/api/user/image/old_profile.png');
    expect(mockRepo.update).toHaveBeenCalledWith(
      'user-profile-id',
      expect.objectContaining({ urlImage: '/api/user/image/profile_123.png' }),
    );
  });

  it('returns file path from storageService on getProfileImagePath', () => {
    const pathResult = service.getProfileImagePath('profile_test.png');
    expect(mockStorage.getFilePath).toHaveBeenCalledWith('profile_test.png', 'profiles');
    expect(pathResult).toBe('data/uploads/profiles/profile_123.png');
  });
});



