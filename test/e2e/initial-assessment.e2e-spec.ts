import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { InitialAssessmentController } from '../../src/organization_module/emergency/controllers/initial-assessment.controller';
import { InitialAssessmentService } from '../../src/organization_module/emergency/services/initial-assessment.service';
import { InitialAssessmentEntity } from '../../src/organization_module/emergency/entities/initial-assessment.entity';
import { EmergencyEntity } from '../../src/organization_module/emergency/entities/emergency.entity';
import { EmergencyStatus } from '../../src/organization_module/emergency/enums/emergency-status.enum';
import { ActionEntity } from '../../src/incident_module/action/entities/action.entity';
import { UserService } from '../../src/user/services/user.service';
import { ROLES } from '../../src/common/constants';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const emergencyId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';

describe('InitialAssessment (e2e)', () => {
  let app: INestApplication;
  const assessmentStore: any[] = [];

  const mockAssessmentRepo = {
    create: (data: any) => ({ ...data }),
    save: async (data: any) => {
      assessmentStore.push(data);
      return { id: 'assessment-1', ...data };
    },
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn().mockImplementation(async ({ where }: any) => ({
      id: where.id,
      hazard_type: 'Derrame',
      severity_level: 'Alto',
    })),
  };

  const mockEmergencyRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: emergencyId,
      state: EmergencyStatus.Pending,
      initialAssessment: null,
    }),
    save: jest.fn().mockImplementation(async (data: any) => data),
  };

  const mockActionRepo = {
    create: (data: any) => ({ ...data }),
    save: jest.fn().mockImplementation(async (data: any) => ({
      id: 'action-1',
      ...data,
    })),
  };

  beforeAll(async () => {
    const reflector = new Reflector();
    const mockUserService = {
      findOneAuth: jest.fn().mockResolvedValue({
        id: userId,
        name: 'John',
        role: ROLES.BASIC,
      }),
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        name: 'John',
        role: ROLES.BASIC,
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InitialAssessmentController],
      providers: [
        { provide: Reflector, useValue: reflector },
        { provide: UserService, useValue: mockUserService },
        {
          provide: getRepositoryToken(InitialAssessmentEntity),
          useValue: mockAssessmentRepo,
        },
        {
          provide: getRepositoryToken(EmergencyEntity),
          useValue: mockEmergencyRepo,
        },
        {
          provide: getRepositoryToken(ActionEntity),
          useValue: mockActionRepo,
        },
        InitialAssessmentService,
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

  const authToken = jwt.sign(
    { sub: userId, role: ROLES.BASIC },
    'test-secret',
    { expiresIn: '1h' },
  );

  it('POST /api/emergency/:id/assessment returns HTTP 201 with the assessment', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/emergency/${emergencyId}/assessment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        hazard_type: 'Derrame de combustible',
        severity_level: 'Alto',
        affected_people_estimated: 25,
        situation_description: 'Dos vehículos involucrados',
        weather_conditions: 'Viento moderado',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.severity_level).toBe('Alto');
    expect(res.body.data.hazard_type).toBe('Derrame de combustible');
  });

  it('PATCH /api/emergency/:id/assessment returns HTTP 200 with updated data', async () => {
    mockEmergencyRepo.findOne.mockResolvedValueOnce({
      id: emergencyId,
      state: EmergencyStatus.Pending,
      initialAssessment: { id: 'assessment-1' },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/assessment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ weather_conditions: 'Sin viento' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('id', 'assessment-1');
  });

  it('POST returns 400 when severity_level is invalid', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/emergency/${emergencyId}/assessment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        hazard_type: 'Derrame',
        severity_level: 'Crítico',
        situation_description: 'Descripción',
      });

    expect(res.status).toBe(400);
  });
});
