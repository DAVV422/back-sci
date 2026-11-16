import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserService } from './user.service';
import { UserEntity } from '../entities/user.entity';
import { QueryDto } from '../../common/dto/query.dto';
import { EmailService } from '../../common/services/email.service';
import { AuthTokenService } from '../../auth/services/auth-token.service';
import { AuthTokenType } from '../../auth/entities/auth-token.entity';
import { ConfigService } from '@nestjs/config';
import { ROLES } from '../../common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProfileDto } from '../dto';

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

  describe('searchDirectory (asignar personal / traspasar mando)', () => {
    beforeEach(() => {
      queryBuilder.select = jest.fn().mockReturnThis();
      queryBuilder.addOrderBy = jest.fn().mockReturnThis();
      queryBuilder.getMany = jest.fn().mockResolvedValue([
        { id: 'u1', name: 'Marta', lastName: 'Rojas', grade: 'Sgto.', isOperational: true, email: 'm@x.bo', role: 'manager' },
      ]);
    });

    it('devuelve solo datos de identificación (sin correo ni rol)', async () => {
      await expect(service.searchDirectory('Mar')).resolves.toEqual([
        { id: 'u1', name: 'Marta', lastName: 'Rojas', grade: 'Sgto.', isOperational: true },
      ]);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.is_active = true');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('user.role != :suadminRole', { suadminRole: ROLES.SUADMIN });
    });

    it('sin texto lista al personal activo, los operativos primero', async () => {
      await service.searchDirectory('  ', 100);
      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('ILIKE :term'), expect.anything());
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('user.is_operational', 'DESC');
      expect(queryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('busca también por grado, escapa comodines y limita a 200 resultados', async () => {
      await service.searchDirectory('50%_', 500);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.stringContaining('user.grade ILIKE :term'), { term: '%50\\%\\_%' });
      expect(queryBuilder.take).toHaveBeenCalledWith(200);
    });
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

  it('saves the map type preference', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'uuid' } as UserEntity);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    await service.updateProfile('uuid', { mapType: 'hybrid' });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', { mapType: 'hybrid' });
  });

  it('rejects an unknown map type in the DTO', async () => {
    const errors = await validate(plainToInstance(UpdateProfileDto, { mapType: 'terrain' }));
    expect(errors.map(e => e.property)).toEqual(['mapType']);
    expect(await validate(plainToInstance(UpdateProfileDto, { mapType: 'roadmap' }))).toEqual([]);
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
      // La cuenta entra en funcionamiento con este cambio, así que queda sellada la fecha.
      activatedAt: expect.any(Date),
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
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ stream: 'stream', size: 3 }),
      exists: jest.fn().mockResolvedValue(true),
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

  const PROFILE_URL = /^\/api\/user\/image\/profile_[0-9a-f-]{36}\.png$/;

  it('guarda la foto con un nombre nuevo y asigna su URL pública al crear el usuario', async () => {
    const mockFile = { originalname: 'avatar.png', mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) } as any;
    jest.spyOn(service, 'findOneBy').mockResolvedValue({ id: 'uuid-img-1', email: 'img@sci.local' } as any);

    await service.createUser(
      { email: 'img@sci.local', name: 'Img', lastName: 'User', role: ROLES.BASIC } as any,
      ROLES.ADMIN,
      mockFile,
    );

    expect(mockStorage.put).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/profiles\/profile_.+\.png$/), mockFile.buffer);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ urlImage: expect.stringMatching(PROFILE_URL) }));
  });

  it('un archivo que no es imagen no se guarda y el usuario se crea sin foto', async () => {
    const fake = { originalname: 'avatar.png', mimetype: 'image/png', buffer: Buffer.from('<script>alert(1)</script>') } as any;
    jest.spyOn(service, 'findOneBy').mockResolvedValue({ id: 'uuid-img-2', email: 'fault@sci.local', urlImage: null } as any);

    const user = await service.createUser(
      { email: 'fault@sci.local', name: 'Fault', lastName: 'User', role: ROLES.BASIC } as any,
      ROLES.ADMIN,
      fake,
    );

    expect(mockStorage.put).not.toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ urlImage: null }));
    expect(user).toBeDefined();
  });

  it('si falla el almacenamiento, el usuario se crea igual sin foto', async () => {
    mockStorage.put.mockRejectedValue(new Error('Disk full error'));
    const mockFile = { originalname: 'broken.png', mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) } as any;
    jest.spyOn(service, 'findOneBy').mockResolvedValue({ id: 'uuid-img-3', email: 'disk@sci.local', urlImage: null } as any);

    await service.createUser({ email: 'disk@sci.local', name: 'D', lastName: 'U', role: ROLES.BASIC } as any, ROLES.ADMIN, mockFile);

    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ urlImage: null }));
  });

  it('al cambiar la foto de perfil borra la anterior', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'user-profile-id', urlImage: '/api/user/image/old_profile.png' } as UserEntity);
    const mockFile = { originalname: 'new_avatar.webp', mimetype: 'image/webp', buffer: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]) } as any;

    await service.updateProfile('user-profile-id', { name: 'Updated' }, mockFile);

    expect(mockStorage.put).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/profiles\/profile_.+\.webp$/), mockFile.buffer);
    expect(mockStorage.delete).toHaveBeenCalledWith('uploads/profiles/old_profile.png');
    expect(mockRepo.update).toHaveBeenCalledWith(
      'user-profile-id',
      expect.objectContaining({ urlImage: expect.stringMatching(/^\/api\/user\/image\/profile_.+\.webp$/) }),
    );
  });

  it('sirve la foto desde el almacenamiento y rechaza nombres con rutas', async () => {
    await service.getProfileImage('profile_test.png');
    expect(mockStorage.get).toHaveBeenCalledWith('uploads/profiles/profile_test.png');
    // Un intento de salir de la carpeta (o un archivo oculto) se rechaza sin tocar el almacenamiento.
    await expect(service.getProfileImage('../../../.env')).rejects.toThrow(BadRequestException);
    expect(mockStorage.get).toHaveBeenCalledTimes(1);
  });
});

describe('UserService - corregir el correo de una cuenta sin activar', () => {
  let service: UserService;
  let mockRepo: any;
  let mockEmailService: any;
  let mockAuthTokenService: any;

  const sinActivar = {
    id: 'uuid-1',
    name: 'Juan',
    lastName: 'Perez',
    email: 'juan@gmai.com', // el dominio mal escrito: la invitación se fue a un buzón ajeno
    role: ROLES.BASIC,
    isActive: false,
  };

  beforeEach(async () => {
    mockRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };
    mockEmailService = { sendActivationEmail: jest.fn().mockResolvedValue(true) };
    mockAuthTokenService = {
      createToken: jest.fn().mockResolvedValue('token-nuevo'),
      revokeUnusedTokens: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuthTokenService, useValue: mockAuthTokenService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ACTIVATION_TOKEN_EXPIRY_HOURS') return '72';
              if (key === 'FRONTEND_URL') return 'https://demo.emerg-ia.com';
              return null;
            }),
          },
        },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  /** `update` consulta el usuario con findOne antes y después de guardar. */
  const prepararUsuario = (usuario: any, despues?: any) => {
    const spy = jest.spyOn(service, 'findOne');
    spy.mockResolvedValueOnce(usuario as any);
    spy.mockResolvedValue((despues ?? usuario) as any);
    return spy;
  };

  it('invalida el enlace anterior y manda la invitación a la dirección nueva', async () => {
    const corregido = { ...sinActivar, email: 'juan@gmail.com' };
    prepararUsuario(sinActivar, corregido);

    await service.update('uuid-1', { email: 'juan@gmail.com' } as any, ROLES.ADMIN);

    expect(mockAuthTokenService.revokeUnusedTokens).toHaveBeenCalledWith('uuid-1', AuthTokenType.ACTIVATION);
    expect(mockAuthTokenService.createToken).toHaveBeenCalled();
    expect(mockEmailService.sendActivationEmail).toHaveBeenCalledWith(
      'juan@gmail.com',
      'Juan Perez',
      expect.stringContaining('token-nuevo'),
    );
  });

  it('revoca ANTES de guardar: si algo falla después, nunca queda vivo el enlace viejo', async () => {
    const orden: string[] = [];
    mockAuthTokenService.revokeUnusedTokens.mockImplementation(async () => {
      orden.push('revocar');
      return 1;
    });
    mockRepo.update.mockImplementation(async () => {
      orden.push('guardar');
      return { affected: 1 };
    });
    prepararUsuario(sinActivar, { ...sinActivar, email: 'juan@gmail.com' });

    await service.update('uuid-1', { email: 'juan@gmail.com' } as any, ROLES.ADMIN);

    expect(orden).toEqual(['revocar', 'guardar']);
  });

  it('no toca ningún token si la cuenta ya está activa', async () => {
    const activo = { ...sinActivar, isActive: true };
    prepararUsuario(activo, { ...activo, email: 'otro@gmail.com' });

    await service.update('uuid-1', { email: 'otro@gmail.com' } as any, ROLES.ADMIN);

    expect(mockAuthTokenService.revokeUnusedTokens).not.toHaveBeenCalled();
    expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
  });

  it('no reenvía nada si el correo no cambió', async () => {
    prepararUsuario(sinActivar);

    await service.update('uuid-1', { email: sinActivar.email, grade: 'Sargento' } as any, ROLES.ADMIN);

    expect(mockAuthTokenService.revokeUnusedTokens).not.toHaveBeenCalled();
    expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
  });

  it('si en el mismo cambio se activa la cuenta, no se manda invitación', async () => {
    prepararUsuario(sinActivar, { ...sinActivar, email: 'juan@gmail.com', isActive: true });

    await service.update(
      'uuid-1',
      { email: 'juan@gmail.com', isActive: true } as any,
      ROLES.ADMIN,
    );

    expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
  });
});

describe('UserService - resendActivation (solo administradores)', () => {
  let service: UserService;
  let mockEmailService: any;
  let mockAuthTokenService: any;

  beforeEach(async () => {
    mockEmailService = { sendActivationEmail: jest.fn().mockResolvedValue(true) };
    mockAuthTokenService = {
      createToken: jest.fn().mockResolvedValue('token-reenviado'),
      revokeUnusedTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: { findOne: jest.fn() } },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuthTokenService, useValue: mockAuthTokenService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'https://demo.emerg-ia.com') },
        },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('emite un enlace nuevo, lo que invalida el anterior', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'uuid-1', name: 'Ana', lastName: 'Flores', email: 'ana@sci.test', isActive: false,
    } as any);

    const resultado = await service.resendActivation('uuid-1', ROLES.ADMIN);

    expect(mockAuthTokenService.createToken).toHaveBeenCalled();
    expect(mockEmailService.sendActivationEmail).toHaveBeenCalledWith(
      'ana@sci.test', 'Ana Flores', expect.stringContaining('token-reenviado'),
    );
    expect(resultado.message).toBe('Invitación reenviada.');
  });

  it('rechaza reenviar a una cuenta ya activa', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'uuid-1', name: 'Ana', lastName: 'Flores', email: 'ana@sci.test', isActive: true,
    } as any);

    await expect(service.resendActivation('uuid-1', ROLES.ADMIN)).rejects.toThrow(
      /ya está activa/i,
    );
    expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
  });
});

describe('UserService - pendiente de activación vs suspendida o eliminada', () => {
  let service: UserService;
  let mockRepo: any;
  let mockEmailService: any;
  let mockAuthTokenService: any;

  // Las tres comparten `isActive: false`, y por eso antes no se podían distinguir.
  const pendiente = { id: 'u1', name: 'Ana', lastName: 'Flores', email: 'ana@sci.test', isActive: false, isDeleted: false, activatedAt: null };
  const suspendida = { ...pendiente, id: 'u2', activatedAt: new Date('2026-03-01T12:00:00Z') };
  const eliminada = { ...pendiente, id: 'u3', isDeleted: true };

  beforeEach(async () => {
    mockRepo = { update: jest.fn().mockResolvedValue({ affected: 1 }), findOne: jest.fn() };
    mockEmailService = { sendActivationEmail: jest.fn().mockResolvedValue(true) };
    mockAuthTokenService = {
      createToken: jest.fn().mockResolvedValue('token-nuevo'),
      revokeUnusedTokens: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuthTokenService, useValue: mockAuthTokenService },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'https://demo.emerg-ia.com') } },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('la regla', () => {
    it('solo una cuenta que nunca entró está pendiente', () => {
      expect(UserService.pendienteDeActivacion(pendiente as any)).toBe(true);
      expect(UserService.pendienteDeActivacion(suspendida as any)).toBe(false);
      expect(UserService.pendienteDeActivacion(eliminada as any)).toBe(false);
      expect(UserService.pendienteDeActivacion({ ...pendiente, isActive: true } as any)).toBe(false);
    });
  });

  describe('reenviar la invitación', () => {
    const conUsuario = (u: any) => jest.spyOn(service, 'findOne').mockResolvedValue(u as any);

    it('se reenvía a una cuenta pendiente', async () => {
      conUsuario(pendiente);
      await expect(service.resendActivation('u1', ROLES.ADMIN)).resolves.toEqual({
        message: 'Invitación reenviada.',
      });
      expect(mockEmailService.sendActivationEmail).toHaveBeenCalled();
    });

    it('NO se reenvía a una cuenta suspendida: se le explica qué hacer', async () => {
      conUsuario(suspendida);
      await expect(service.resendActivation('u2', ROLES.ADMIN)).rejects.toThrow(/suspendida/i);
      expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
    });

    it('NO se reenvía a una cuenta eliminada, y responde como si no existiera', async () => {
      conUsuario(eliminada);
      await expect(service.resendActivation('u3', ROLES.ADMIN)).rejects.toThrow(/no encontrado/i);
      expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
    });
  });

  describe('corregir el correo', () => {
    const corregir = (u: any) => {
      const spy = jest.spyOn(service, 'findOne');
      spy.mockResolvedValueOnce(u as any);
      spy.mockResolvedValue({ ...u, email: 'nuevo@sci.test' } as any);
      return service.update(u.id, { email: 'nuevo@sci.test' } as any, ROLES.ADMIN);
    };

    it('a una cuenta pendiente: revoca el enlace viejo y manda uno nuevo', async () => {
      await corregir(pendiente);
      expect(mockAuthTokenService.revokeUnusedTokens).toHaveBeenCalled();
      expect(mockEmailService.sendActivationEmail).toHaveBeenCalled();
    });

    it('a una cuenta suspendida: cambia el correo y NO manda invitación', async () => {
      await corregir(suspendida);
      expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalled();
    });

    it('a una cuenta eliminada: cambia el correo y NO la resucita con una invitación', async () => {
      await corregir(eliminada);
      expect(mockEmailService.sendActivationEmail).not.toHaveBeenCalled();
    });
  });

  describe('marca de activación', () => {
    it('al activar por primera vez se sella la fecha', async () => {
      const spy = jest.spyOn(service, 'findOne');
      spy.mockResolvedValueOnce(pendiente as any);
      spy.mockResolvedValue({ ...pendiente, isActive: true } as any);

      await service.update('u1', { isActive: true } as any, ROLES.ADMIN);

      expect(mockRepo.update).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ isActive: true, activatedAt: expect.any(Date) }),
      );
    });

    it('al rehabilitar una cuenta suspendida no se pisa la fecha original', async () => {
      const spy = jest.spyOn(service, 'findOne');
      spy.mockResolvedValueOnce(suspendida as any);
      spy.mockResolvedValue({ ...suspendida, isActive: true } as any);

      await service.update('u2', { isActive: true } as any, ROLES.ADMIN);

      expect(mockRepo.update.mock.calls[0][1].activatedAt).toBeUndefined();
    });
  });
});

describe('UserService - findOneAuth comprueba el estado en cada petición', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = { findOne: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
        { provide: EmailService, useValue: {} },
        { provide: AuthTokenService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
  });

  it('deja pasar a una cuenta activa', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'u1', isActive: true, isDeleted: false });
    await expect(service.findOneAuth('u1')).resolves.toMatchObject({ id: 'u1' });
  });

  // Antes, el token seguía sirviendo hasta expirar: hasta 8 horas de acceso tras ser eliminado.
  it('corta el acceso de una cuenta eliminada aunque su token siga vigente', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'u2', isActive: true, isDeleted: true });
    await expect(service.findOneAuth('u2')).rejects.toThrow(/ya no tiene acceso/i);
  });

  it('corta el acceso de una cuenta suspendida', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'u3', isActive: false, isDeleted: false });
    await expect(service.findOneAuth('u3')).rejects.toThrow(/ya no tiene acceso/i);
  });
});
