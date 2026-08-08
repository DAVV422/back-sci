import { INestApplication, ValidationPipe } from '@nestjs/common';
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

describe('User status endpoint (e2e)', () => {
  let app: INestApplication;
  let mockUserService: any;

  const managerToken = jwt.sign(
    { sub: userId, role: ROLES.MANAGER },
    'test-secret',
    { expiresIn: '1h' },
  );
  const basicToken = jwt.sign(
    { sub: userId, role: ROLES.BASIC },
    'test-secret',
    { expiresIn: '1h' },
  );

  beforeAll(async () => {
    mockUserService = {
      findOneAuth: jest.fn(),
      updateStatus: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: Reflector, useValue: new Reflector() },
        AuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(new TraceIdMiddleware().use);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /api/user/status/:id with MANAGER token changes is_active to false (HTTP 200)', () => {
    mockUserService.findOneAuth.mockResolvedValue({
      id: userId,
      role: ROLES.MANAGER,
    });
    mockUserService.updateStatus.mockResolvedValue({
      id: userId,
      name: 'John',
      is_active: false,
    });

    return request(app.getHttpServer())
      .patch(`/api/user/status/${userId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ is_active: false })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.statusCode).toBe(200);
        expect(res.body.data.is_active).toBe(false);
        expect(mockUserService.updateStatus).toHaveBeenCalledWith(userId, {
          is_active: false,
        });
      });
  });

  it('PATCH /api/user/status/:id with BASIC token returns HTTP 403 Forbidden', () => {
    mockUserService.findOneAuth.mockResolvedValue({
      id: userId,
      role: ROLES.BASIC,
    });

    return request(app.getHttpServer())
      .patch(`/api/user/status/${userId}`)
      .set('Authorization', `Bearer ${basicToken}`)
      .send({ is_active: false })
      .expect(403);
  });
});
