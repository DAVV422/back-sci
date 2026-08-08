import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { EmergencyController } from '../../src/organization_module/emergency/controllers/emergency.controller';
import { EmergencyService } from '../../src/organization_module/emergency/services/emergency.service';
import { EmergencyStateMachine } from '../../src/organization_module/emergency/services/emergency-state-machine';
import { EmergencyEntity } from '../../src/organization_module/emergency/entities/emergency.entity';
import { EmergencyStatus } from '../../src/organization_module/emergency/enums/emergency-status.enum';
import { ActionEntity } from '../../src/incident_module/action/entities/action.entity';
import { UserService } from '../../src/user/services/user.service';
import { DataSource } from 'typeorm';
import { ROLES } from '../../src/common/constants';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const emergencyId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';

describe('Emergency state transitions (e2e)', () => {
  let app: INestApplication;
  let savedEmergency: any;
  const actionStore: any[] = [];

  const mockEmergencyRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation(async (data: any) => {
      savedEmergency = { ...data };
      return savedEmergency;
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }),
  };

  const mockActionRepo = {
    create: (data: any) => ({ ...data }),
    save: jest.fn().mockImplementation(async (data: any) => {
      actionStore.push(data);
      return { id: 'action-1', ...data };
    }),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      manager: {
        create: (data: any) => ({ ...data }),
        save: jest.fn().mockImplementation(async (data: any) => data),
      },
    }),
  };

  const setEmergency = (state: EmergencyStatus, forms?: any) => {
    savedEmergency = {
      id: emergencyId,
      code: 'EMG-001',
      name: 'Incendio',
      state,
      form201: forms?.form201 ?? [],
      form207: forms?.form207 ?? [],
    };
    mockEmergencyRepo.findOne.mockResolvedValue(savedEmergency);
  };

  const buildApp = async (role: string) => {
    const reflector = new Reflector();
    const mockUserService = {
      findOneAuth: jest.fn().mockResolvedValue({
        id: userId,
        name: 'John',
        role,
      }),
      findOne: jest.fn().mockResolvedValue({
        id: userId,
        name: 'John',
        role,
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmergencyController],
      providers: [
        { provide: Reflector, useValue: reflector },
        { provide: UserService, useValue: mockUserService },
        {
          provide: getRepositoryToken(EmergencyEntity),
          useValue: mockEmergencyRepo,
        },
        {
          provide: getRepositoryToken(ActionEntity),
          useValue: mockActionRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        EmergencyStateMachine,
        EmergencyService,
        AuthGuard,
        RolesGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  };

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const tokenFor = (role: string) =>
    jwt.sign({ sub: userId, role }, 'test-secret', { expiresIn: '1h' });

  it('ciclo p → a → f → a (MANAGER) → f', async () => {
    setEmergency(EmergencyStatus.Pending);
    await buildApp(ROLES.BASIC);

    const token = tokenFor(ROLES.BASIC);

    let res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${token}`)
      .send({ state: EmergencyStatus.Active });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe(EmergencyStatus.Active);

    setEmergency(EmergencyStatus.Active, {
      form201: [{ id: 'f201-1', is_finalized: false }],
      form207: [{ id: 'f207-1', is_finalized: false }],
    });

    res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${token}`)
      .send({ state: EmergencyStatus.Finished });
    expect(res.status).toBe(400);

    setEmergency(EmergencyStatus.Active, {
      form201: [{ id: 'f201-1', is_finalized: true }],
      form207: [{ id: 'f207-1', is_finalized: true }],
    });

    res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${token}`)
      .send({ state: EmergencyStatus.Finished });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe(EmergencyStatus.Finished);

    setEmergency(EmergencyStatus.Finished);

    res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${token}`)
      .send({ state: EmergencyStatus.Active });
    expect(res.status).toBe(403);

    await app.close();
    await buildApp(ROLES.MANAGER);

    res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.MANAGER)}`)
      .send({ state: EmergencyStatus.Active });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe(EmergencyStatus.Active);

    res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.MANAGER)}`)
      .send({ state: EmergencyStatus.Finished });
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe(EmergencyStatus.Finished);
  });

  it('cancela con motivo: 200 y registra acción', async () => {
    setEmergency(EmergencyStatus.Pending);
    await app.close();
    await buildApp(ROLES.BASIC);

    const res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.BASIC)}`)
      .send({
        state: EmergencyStatus.Canceled,
        cancellation_reason: 'Falso reporte',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe(EmergencyStatus.Canceled);
    expect(
      actionStore.some((a) => a.description.includes('Falso reporte')),
    ).toBe(true);
  });

  it('cancela sin motivo: 400', async () => {
    setEmergency(EmergencyStatus.Pending);

    const res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.BASIC)}`)
      .send({ state: EmergencyStatus.Canceled });

    expect(res.status).toBe(400);
  });

  it('state inválido: 400 por validación del DTO', async () => {
    setEmergency(EmergencyStatus.Pending);

    const res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.BASIC)}`)
      .send({ state: 'xyz' });

    expect(res.status).toBe(400);
  });

  it('flujo integrado F1-011: finalizar → editar bloqueado → reabrir (MANAGER) → editar OK', async () => {
    setEmergency(EmergencyStatus.Finished);

    let res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.BASIC)}`)
      .send({ name: 'Edición prohibida' });
    expect(res.status).toBe(400);

    await app.close();
    await buildApp(ROLES.MANAGER);

    res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}/state`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.MANAGER)}`)
      .send({ state: EmergencyStatus.Active });
    expect(res.status).toBe(200);

    await app.close();
    await buildApp(ROLES.BASIC);
    setEmergency(EmergencyStatus.Active);

    res = await request(app.getHttpServer())
      .patch(`/api/emergency/${emergencyId}`)
      .set('Authorization', `Bearer ${tokenFor(ROLES.BASIC)}`)
      .send({ name: 'Edición permitida' });
    expect(res.status).toBe(200);
  });
});
