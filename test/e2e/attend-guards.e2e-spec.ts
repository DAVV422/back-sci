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
import { AttendController } from '../../src/organization_module/attends/controllers/attends.controller';
import { AttendService } from '../../src/organization_module/attends/services/attends.service';
import { UserService } from '../../src/user/services/user.service';

const attendId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const userId = 'a1b2c3d4-1111-4222-8333-1d2c3b4a5f6e';
const emergencyId = 'b1c2d3e4-2222-4333-8444-1d2c3b4a5f6e';
const oldChargeId = 'c1d2e3f4-3333-4444-8555-1d2c3b4a5f6e';
const newChargeId = 'd1e2f3a4-4444-4555-8666-1d2c3b4a5f6e';

const signToken = (role: ROLES) =>
  jwt.sign({ sub: userId, role }, 'test-secret', { expiresIn: '1h' });

describe('Attend guards (e2e)', () => {
  let app: INestApplication;
  let mockService: any;
  let mockUserService: any;
  let reflector: Reflector;

  const buildUser = (role: ROLES) =>
    Object.assign({
      id: userId,
      name: 'John',
      last_name: 'Doe',
      email: 'john@live.com',
      password: 'hashed-secret',
      cellphone: '67303349',
      grade: 'Capitán',
      role,
      is_active: true,
    });

  const buildAttend = (overrides = {}) =>
    Object.assign({
      id: attendId,
      date: '2024-06-19',
      hour: '14:30',
      is_active: true,
      charge_system_name: 'comandante_incidente',
      user: buildUser(ROLES.MANAGER),
      emergency: { id: emergencyId },
      charge: { id: oldChargeId },
      ...overrides,
    });

  beforeAll(async () => {
    mockService = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    reflector = new Reflector();
    mockUserService = { findOneAuth: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AttendController],
      providers: [
        { provide: AttendService, useValue: mockService },
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

  it('POST /api/attend without token returns HTTP 401', () => {
    return request(app.getHttpServer())
      .post('/api/attend')
      .send({
        date: '2024-06-19',
        hour: '14:30',
        user: userId,
        emergency: emergencyId,
        charge: oldChargeId,
      })
      .expect(401);
  });

  it('POST /api/attend with BASIC token returns HTTP 403', () => {
    mockService.create.mockResolvedValue(buildAttend());
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.BASIC));
    return request(app.getHttpServer())
      .post('/api/attend')
      .set('Authorization', `Bearer ${signToken(ROLES.BASIC)}`)
      .send({
        date: '2024-06-19',
        hour: '14:30',
        user: userId,
        emergency: emergencyId,
        charge: oldChargeId,
      })
      .expect(403);
  });

  it('POST /api/attend with MANAGER token returns HTTP 201', () => {
    mockService.create.mockResolvedValue(buildAttend());
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.MANAGER));
    return request(app.getHttpServer())
      .post('/api/attend')
      .set('Authorization', `Bearer ${signToken(ROLES.MANAGER)}`)
      .send({
        date: '2024-06-19',
        hour: '14:30',
        user: userId,
        emergency: emergencyId,
        charge: oldChargeId,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(attendId);
      });
  });

  it('PATCH /api/attend/:id updates the charge with MANAGER token (HTTP 200)', () => {
    mockService.update.mockResolvedValue(
      buildAttend({ charge: { id: newChargeId } }),
    );
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.MANAGER));
    return request(app.getHttpServer())
      .patch(`/api/attend/${attendId}`)
      .set('Authorization', `Bearer ${signToken(ROLES.MANAGER)}`)
      .send({ chargeId: newChargeId })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(mockService.update).toHaveBeenCalledWith(attendId, {
          chargeId: newChargeId,
        });
      });
  });

  it('PATCH /api/attend/:id with BASIC token returns HTTP 403', () => {
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.BASIC));
    return request(app.getHttpServer())
      .patch(`/api/attend/${attendId}`)
      .set('Authorization', `Bearer ${signToken(ROLES.BASIC)}`)
      .send({ chargeId: newChargeId })
      .expect(403);
  });

  it('GET /api/attend/:id without token returns HTTP 401', () => {
    return request(app.getHttpServer())
      .get(`/api/attend/${attendId}`)
      .expect(401);
  });

  it('GET /api/attend/:id with BASIC token returns HTTP 200', () => {
    mockService.findOne.mockResolvedValue(buildAttend());
    mockUserService.findOneAuth.mockResolvedValue(buildUser(ROLES.BASIC));
    return request(app.getHttpServer())
      .get(`/api/attend/${attendId}`)
      .set('Authorization', `Bearer ${signToken(ROLES.BASIC)}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(attendId);
      });
  });
});
