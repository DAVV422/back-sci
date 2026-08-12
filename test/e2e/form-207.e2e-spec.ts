import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { Form207Controller } from '../../src/victim_registry_module/form-207/controllers/form-207.controller';
import { Form207Service } from '../../src/victim_registry_module/form-207/services/form-207.service';
import { Form207Entity } from '../../src/victim_registry_module/form-207/entities/form-207.entity';
import { EmergencyForm207CounterEntity } from '../../src/victim_registry_module/form-207/entities/form-207-counter.entity';
import { EmergencyEntity } from '../../src/organization_module/emergency/entities/emergency.entity';
import { ActionEntity } from '../../src/incident_module/action/entities/action.entity';
import { EmergencyService } from '../../src/organization_module/emergency/services/emergency.service';
import { UserService } from '../../src/user/services/user.service';
import { EmergencyStatus } from '../../src/organization_module/emergency/enums/emergency-status.enum';
import { DataSource } from 'typeorm';
import { ROLES } from '../../src/common/constants';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const emergencyId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const form207Id = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

describe('Form207 (e2e)', () => {
  let app: INestApplication;
  let formStore: any[] = [];

  const mockEmergency = {
    id: emergencyId,
    code: 'EMG-001',
    name: 'Accidente Químico',
    state: EmergencyStatus.Active,
  };

  const mockUser = {
    id: userId,
    name: 'John',
    last_name: 'Doe',
    role: ROLES.BASIC,
  };

  const mockForm207Repo = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
  };

  const mockActionRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation(async (action) => ({ id: 'action-1', ...action })),
  };

  const mockEmergencyService = {
    findOne: jest.fn().mockResolvedValue(mockEmergency),
    assertEditable: jest.fn(),
  };

  const mockUserService = {
    findOneAuth: jest.fn().mockResolvedValue(mockUser),
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  const queryRunnerMock = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([{ last_value: 1 }]),
    manager: {
      findOne: jest.fn().mockImplementation((entityClass, options) => {
        if (entityClass.name === 'EmergencyEntity') {
          return mockEmergency;
        }
        if (entityClass.name === 'UserEntity') {
          return mockUser;
        }
        return null;
      }),
      create: jest.fn().mockImplementation((entityClass, dto) => ({ id: form207Id, ...dto })),
      save: jest.fn().mockImplementation((entityClass, data) => data),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
  };

  beforeAll(async () => {
    const reflector = new Reflector();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [Form207Controller],
      providers: [
        Form207Service,
        { provide: Reflector, useValue: reflector },
        { provide: UserService, useValue: mockUserService },
        { provide: EmergencyService, useValue: mockEmergencyService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Form207Entity), useValue: mockForm207Repo },
        { provide: getRepositoryToken(EmergencyForm207CounterEntity), useValue: {} },
        { provide: getRepositoryToken(ActionEntity), useValue: mockActionRepo },
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

  const formPayload = {
    place_of_registration: 'Entrada Principal',
    attendant: 'John Doe',
    date: '2026-08-11T12:00:00Z',
  };

  it('GET /api/emergency/:emergencyId/form207 without token returns HTTP 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/emergency/${emergencyId}/form207`);

    expect(res.status).toBe(401);
  });

  it('POST /api/emergency/:emergencyId/form207 successfully creates Form207', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/emergency/${emergencyId}/form207`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(formPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', form207Id);
    expect(res.body.data.code).toBe('F207-001');
  });

  it('POST /api/emergency/:emergencyId/form207 fails with 400 if emergency is closed', async () => {
    mockEmergencyService.assertEditable.mockImplementationOnce(() => {
      throw new Error('Emergency is not editable');
    });

    const res = await request(app.getHttpServer())
      .post(`/api/emergency/${emergencyId}/form207`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(formPayload);

    expect(res.status).toBe(400);
  });

  it('PATCH /api/form207/:id/finalize successfully finalizes Form207', async () => {
    const existingForm = {
      id: form207Id,
      code: 'F207-001',
      is_finalized: false,
      emergency: mockEmergency,
    };
    mockForm207Repo.findOne.mockResolvedValueOnce(existingForm);
    mockForm207Repo.save.mockResolvedValueOnce({ ...existingForm, is_finalized: true });

    const res = await request(app.getHttpServer())
      .patch(`/api/form207/${form207Id}/finalize`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_finalized).toBe(true);
  });
});
