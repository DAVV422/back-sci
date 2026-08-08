import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { AuthController } from '../../src/auth/controllers/auth.controller';
import { AuthService } from '../../src/auth/services/auth.service';
import { JwtServiceAdapter } from '../../src/auth/services/jwt.service';
import { TokenValidatorService } from '../../src/auth/services/token-validator.service';
import { RefreshTokenEntity } from '../../src/auth/entities/refresh-token.entity';
import { ROLES } from '../../src/common/constants';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TraceIdMiddleware } from '../../src/common/middleware/trace-id.middleware';
import { UserController } from '../../src/user/controllers/user.controller';
import { UserEntity } from '../../src/user/entities/user.entity';
import { UserService } from '../../src/user/services/user.service';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';

describe('Refresh token rotation (e2e)', () => {
  let app: INestApplication;
  let mockUserService: any;
  let reflector: Reflector;
  const tokens: any[] = [];

  const mockRefreshRepo = {
    create: (data: any) => ({ ...data }),
    save: async (data: any) => {
      if (!tokens.includes(data)) tokens.push(data);
      return data;
    },
    findOne: async ({ where }: any) =>
      tokens.find((t) => t.userId === where.user.id && !t.isRevoked) || null,
  };

  beforeAll(async () => {
    reflector = new Reflector();
    const password = '123456';
    mockUserService = {
      findByEmail: jest.fn().mockResolvedValue(
        Object.assign(new UserEntity(), {
          id: userId,
          name: 'John',
          email: 'john@live.com',
          password: bcrypt.hashSync(password, 10),
          role: ROLES.BASIC,
          isDeleted: false,
        }),
      ),
      findOne: jest.fn().mockResolvedValue(
        Object.assign(new UserEntity(), {
          id: userId,
          name: 'John',
          email: 'john@live.com',
          password: bcrypt.hashSync(password, 10),
          role: ROLES.BASIC,
        }),
      ),
      findOneAuth: jest.fn().mockResolvedValue(
        Object.assign(new UserEntity(), {
          id: userId,
          name: 'John',
          email: 'john@live.com',
          role: ROLES.BASIC,
        }),
      ),
    };

    const mockConfigService = {
      get: (key: string) =>
        ({
          JWT_AUTH: 'test-secret',
          JWT_EXPIRATION: '1d',
          JWT_REFRESH_EXPIRATION: '7d',
        }[key]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, UserController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserService, useValue: mockUserService },
        { provide: TokenValidatorService, useValue: {} },
        { provide: Reflector, useValue: reflector },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockRefreshRepo,
        },
        JwtServiceAdapter,
        AuthService,
        AuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(new TraceIdMiddleware().use);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login returns refreshToken; refresh rotates it; new accessToken works; old token returns 401', async () => {
    const httpServer = app.getHttpServer();

    const loginRes = await request(httpServer)
      .post('/api/login')
      .send({ email: 'john@live.com', password: '123456' });

    expect(loginRes.status).toBe(201);
    const { accessToken, refreshToken } = loginRes.body.data;
    expect(refreshToken).toBeTruthy();

    const refreshRes = await request(httpServer)
      .post('/api/refresh-token')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(201);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    const meRes = await request(httpServer)
      .get('/api/user/me')
      .set('Authorization', `Bearer ${refreshRes.body.data.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.id).toBe(userId);
    expect(meRes.body.data.password).toBeUndefined();

    const oldTokenRes = await request(httpServer)
      .post('/api/refresh-token')
      .send({ refreshToken });
    expect(oldTokenRes.status).toBe(401);
  });

  it('refresh with an invalid token returns HTTP 401', async () => {
    return request(app.getHttpServer())
      .post('/api/refresh-token')
      .send({ refreshToken: 'not-a-valid-token' })
      .expect(401);
  });
});
