import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { ROLES } from '../../src/common/constants';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TraceIdMiddleware } from '../../src/common/middleware/trace-id.middleware';
import { UserController } from '../../src/user/controllers/user.controller';
import { UserService } from '../../src/user/services/user.service';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';

const signToken = (role: ROLES) =>
  jwt.sign({ sub: userId, role }, 'test-secret', { expiresIn: '1h' });

describe('User list excludes admin (e2e)', () => {
  let app: INestApplication;
  let mockUserService: any;
  let reflector: Reflector;

  const buildUser = (role: ROLES, name = 'User') =>
    Object.assign({
      id: userId,
      name,
      last_name: 'Doe',
      email: `${name.toLowerCase()}@live.com`,
      password: 'hashed-secret',
      cellphone: '67303349',
      grade: 'Capitán',
      role,
      is_active: true,
    });

  beforeAll(async () => {
    mockUserService = {
      findOneAuth: jest.fn(),
      findAll: jest.fn(),
    };
    reflector = new Reflector();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: Reflector, useValue: reflector },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/user without token returns HTTP 401', () => {
    return request(app.getHttpServer()).get('/api/user').expect(401);
  });

  it('GET /api/user with BASIC token returns HTTP 403', () => {
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.BASIC));
    return request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Bearer ${signToken(ROLES.BASIC)}`)
      .expect(403);
  });

  it('GET /api/user with MANAGER token returns HTTP 200 without admin users', () => {
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.MANAGER));
    const nonAdminUsers = [
      buildUser(ROLES.BASIC, 'Juan'),
      buildUser(ROLES.MANAGER, 'Maria'),
    ];
    mockUserService.findAll.mockResolvedValue({
      items: nonAdminUsers,
      total: 2,
    });

    return request(app.getHttpServer())
      .get('/api/user')
      .set('Authorization', `Bearer ${signToken(ROLES.MANAGER)}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.meta.total).toBe(2);
        const roles = res.body.data.map((u: any) => u.role);
        expect(roles).not.toContain(ROLES.ADMIN);
      });
  });

  it('GET /api/user forwards attr/value filters to the service', () => {
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.MANAGER));
    mockUserService.findAll.mockResolvedValue({ items: [], total: 0 });

    return request(app.getHttpServer())
      .get('/api/user?attr=name&value=juan')
      .set('Authorization', `Bearer ${signToken(ROLES.MANAGER)}`)
      .expect(200)
      .expect(() => {
        expect(mockUserService.findAll).toHaveBeenCalledWith(
          expect.objectContaining({ attr: 'name', value: 'juan' }),
        );
      });
  });
});
