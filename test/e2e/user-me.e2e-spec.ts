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
import { UserEntity } from '../../src/user/entities/user.entity';
import { UserService } from '../../src/user/services/user.service';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';

describe('User /me endpoints (e2e)', () => {
  let app: INestApplication;
  let mockUserService: any;
  let reflector: Reflector;

  const token = jwt.sign({ sub: userId, role: ROLES.BASIC }, 'test-secret', {
    expiresIn: '1h',
  });

  const buildUser = (overrides: Partial<UserEntity> = {}) =>
    Object.assign(new UserEntity(), {
      id: userId,
      name: 'John',
      last_name: 'Doe',
      email: 'john@live.com',
      password: 'hashed-secret',
      cellphone: '67303349',
      grade: 'Capitán',
      role: ROLES.BASIC,
      is_active: true,
      ...overrides,
    });

  beforeAll(async () => {
    mockUserService = {
      findOneAuth: jest.fn(),
      findOne: jest.fn(),
      updateProfile: jest.fn(),
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

  it('GET /api/user/me returns the authenticated user without password (HTTP 200)', () => {
    mockUserService.findOneAuth.mockResolvedValue(buildUser());
    mockUserService.findOne.mockResolvedValue(buildUser());

    return request(app.getHttpServer())
      .get('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(userId);
        expect(res.body.data.name).toBe('John');
        expect(res.body.data.password).toBeUndefined();
      });
  });

  it('PATCH /api/user/me updates the own name (HTTP 200)', () => {
    mockUserService.findOneAuth.mockResolvedValue(buildUser());
    mockUserService.updateProfile.mockResolvedValue(
      buildUser({ name: 'Nuevo' }),
    );

    return request(app.getHttpServer())
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nuevo' })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Nuevo');
        expect(mockUserService.updateProfile).toHaveBeenCalledWith(userId, {
          name: 'Nuevo',
        });
      });
  });

  it('PATCH /api/user/me ignores non-editable fields like role (HTTP 200)', () => {
    mockUserService.findOneAuth.mockResolvedValue(buildUser());
    mockUserService.updateProfile.mockResolvedValue(
      buildUser({ role: ROLES.BASIC }),
    );

    return request(app.getHttpServer())
      .patch('/api/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: ROLES.ADMIN })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.role).toBe(ROLES.BASIC);
      });
  });

  it('GET /api/user/me without token returns HTTP 401', () => {
    return request(app.getHttpServer()).get('/api/user/me').expect(401);
  });
});
