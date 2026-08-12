import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { RegistrationController } from '../../src/victim_registry_module/registration/controllers/registration.controller';
import { RegistrationService } from '../../src/victim_registry_module/registration/services/registration.service';
import { RegistrationEntity } from '../../src/victim_registry_module/registration/entities/registration.entity';
import { Form207Service } from '../../src/victim_registry_module/form-207/services/form-207.service';
import { VictimService } from '../../src/victim_registry_module/victim/services/victim.service';
import { EmergencyService } from '../../src/organization_module/emergency/services/emergency.service';
import { UserService } from '../../src/user/services/user.service';
import { ROLES } from '../../src/common/constants';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const victimId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
const form207Id = 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e';
const registrationId = 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f';

describe('Registration (e2e)', () => {
  let app: INestApplication;

  const mockForm207 = {
    id: form207Id,
    code: 'F207-001',
    is_finalized: false,
    emergency: { id: 'emergency-1' },
  };

  const mockVictim = {
    id: victimId,
    identifier: 'NN-001',
  };

  const mockUser = {
    id: userId,
    name: 'John',
    last_name: 'Doe',
    role: ROLES.BASIC,
  };

  const mockRegistration = {
    id: registrationId,
    classification: 'rojo',
    transferredBy: 'Ambulancia-1',
    date: new Date(),
    hour: '12:00',
    victim: mockVictim,
    form207: mockForm207,
    user: mockUser,
  };

  const mockRegistrationRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation(async (reg) => ({ id: registrationId, ...reg })),
    find: jest.fn().mockResolvedValue([mockRegistration]),
  };

  const mockForm207Service = {
    findOne: jest.fn().mockResolvedValue(mockForm207),
  };

  const mockVictimService = {
    findOne: jest.fn().mockResolvedValue(mockVictim),
  };

  const mockEmergencyService = {
    assertEditable: jest.fn(),
  };

  const mockUserService = {
    findOneAuth: jest.fn().mockResolvedValue(mockUser),
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  beforeAll(async () => {
    const reflector = new Reflector();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [
        RegistrationService,
        { provide: Reflector, useValue: reflector },
        { provide: UserService, useValue: mockUserService },
        { provide: Form207Service, useValue: mockForm207Service },
        { provide: VictimService, useValue: mockVictimService },
        { provide: EmergencyService, useValue: mockEmergencyService },
        { provide: getRepositoryToken(RegistrationEntity), useValue: mockRegistrationRepo },
        AuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const getAuthToken = (role: string) => {
    return jwt.sign({ sub: userId, role }, 'test-secret', { expiresIn: '1h' });
  };

  const payload = {
    victimId,
    classification: 'rojo',
    transferredBy: 'Ambulancia-2',
    notes: 'Prioritario',
  };

  it('POST /api/form207/:form207Id/registration without token returns HTTP 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/form207/${form207Id}/registration`)
      .send(payload);

    expect(res.status).toBe(401);
  });

  it('POST /api/form207/:form207Id/registration successfully registers triage', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/form207/${form207Id}/registration`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', registrationId);
    expect(res.body.data.classification).toBe('rojo');
  });

  it('POST /api/form207/:form207Id/registration fails with 400 if Form 207 is finalized', async () => {
    mockForm207Service.findOne.mockResolvedValueOnce({
      ...mockForm207,
      is_finalized: true,
    });

    const res = await request(app.getHttpServer())
      .post(`/api/form207/${form207Id}/registration`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(payload);

    expect(res.status).toBe(400);
  });

  it('GET /api/form207/:form207Id/registration returns list of registered victims', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/form207/${form207Id}/registration`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/victim/:victimId/registration returns victim evolutive triage log history', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/victim/${victimId}/registration`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
