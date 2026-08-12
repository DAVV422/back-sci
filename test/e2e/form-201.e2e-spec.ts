import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { Form201Controller } from '../../src/incident_module/form-201/controllers/form-201.controller';
import { Form201Service } from '../../src/incident_module/form-201/services/form-201.service';
import { Form201Entity } from '../../src/incident_module/form-201/entities/form-201.entity';
import { EmergencyEntity } from '../../src/organization_module/emergency/entities/emergency.entity';
import { AttendEntity } from '../../src/organization_module/attends/entities/attends.entity';
import { ActionEntity } from '../../src/incident_module/action/entities/action.entity';
import { EmergencyService } from '../../src/organization_module/emergency/services/emergency.service';
import { UserService } from '../../src/user/services/user.service';
import { EmergencyStatus } from '../../src/organization_module/emergency/enums/emergency-status.enum';
import { ROLES } from '../../src/common/constants';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const emergencyId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const form201Id = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

describe('Form201 (e2e)', () => {
  let app: INestApplication;
  let formStore: any[] = [];

  const mockEmergency = {
    id: emergencyId,
    code: 'EMG-001',
    name: 'Incendio Forestal',
    state: EmergencyStatus.Active,
  };

  const mockUser = {
    id: userId,
    name: 'John',
    last_name: 'Doe',
    role: ROLES.BASIC,
  };

  const mockForm201Repo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation(async (form) => {
      const saved = { id: form201Id, isDeleted: false, isFinalized: false, ...form };
      formStore.push(saved);
      return saved;
    }),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAttendRepo = {
    find: jest.fn().mockResolvedValue([]),
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

  beforeAll(async () => {
    const reflector = new Reflector();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [Form201Controller],
      providers: [
        Form201Service,
        { provide: Reflector, useValue: reflector },
        { provide: UserService, useValue: mockUserService },
        { provide: EmergencyService, useValue: mockEmergencyService },
        { provide: getRepositoryToken(Form201Entity), useValue: mockForm201Repo },
        { provide: getRepositoryToken(AttendEntity), useValue: mockAttendRepo },
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
    date: '2026-08-11',
    nature: 'Incendio Forestal',
    thread: 'Fuego forestal de rápida propagación',
    affectedArea: 'Sector La Pampa',
    communicationsChannel: 'VHF Canal 2',
    entryRoute: 'Ruta Nacional 9',
    egressRoute: 'Ruta Provincial 34',
    objectives: '1. Contención. 2. Liquidación.',
    strategies: 'Uso de cortafuegos y líneas de defensa.',
    tactics: 'Ataque directo por tierra y apoyo aéreo.',
    safetyMessage: 'Priorizar integridad física y uso de EPP completo.',
  };

  it('POST /api/emergency/:emergencyId/form201 successfully creates Form201', async () => {
    mockForm201Repo.findOne.mockResolvedValueOnce(null); // No active form

    const res = await request(app.getHttpServer())
      .post(`/api/emergency/${emergencyId}/form201`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(formPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', form201Id);
    expect(res.body.data.code).toBe('F201-001');
  });

  it('POST /api/emergency/:emergencyId/form201 fails with 400 if an active Form201 already exists', async () => {
    mockForm201Repo.findOne.mockResolvedValueOnce({ id: 'form-existing' }); // Active form exists

    const res = await request(app.getHttpServer())
      .post(`/api/emergency/${emergencyId}/form201`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(formPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/emergency/:emergencyId/form201 converts duplicate key 23505 DB error to 409 Conflict', async () => {
    mockForm201Repo.findOne.mockResolvedValueOnce(null); // Pass initial check
    const dbError: any = new Error('Unique constraint violation');
    dbError.code = '23505';
    mockForm201Repo.save.mockRejectedValueOnce(dbError);

    const res = await request(app.getHttpServer())
      .post(`/api/emergency/${emergencyId}/form201`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(formPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Ya existe un Formulario 201 activo');
  });

  it('PATCH /api/form201/:id updates successfully', async () => {
    const existingForm = {
      id: form201Id,
      isFinalized: false,
      emergency: mockEmergency,
    };
    mockForm201Repo.findOne.mockResolvedValueOnce(existingForm);
    mockForm201Repo.findOne.mockResolvedValueOnce({ ...existingForm, nature: 'Nuevo Incendio' });

    const res = await request(app.getHttpServer())
      .patch(`/api/form201/${form201Id}`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send({ nature: 'Nuevo Incendio' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nature).toBe('Nuevo Incendio');
    expect(mockForm201Repo.update).toHaveBeenCalled();
  });

  it('PATCH /api/form201/:id fails with 400 if the form is already finalized', async () => {
    const existingForm = {
      id: form201Id,
      isFinalized: true,
      emergency: mockEmergency,
    };
    mockForm201Repo.findOne.mockResolvedValueOnce(existingForm);

    const res = await request(app.getHttpServer())
      .patch(`/api/form201/${form201Id}`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send({ nature: 'Intento de edición' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/form201/:id does soft-delete', async () => {
    const existingForm = {
      id: form201Id,
      isFinalized: false,
      emergency: mockEmergency,
    };
    mockForm201Repo.findOne.mockResolvedValueOnce(existingForm);

    const res = await request(app.getHttpServer())
      .delete(`/api/form201/${form201Id}`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.MANAGER)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockForm201Repo.update).toHaveBeenCalledWith(form201Id, { isDeleted: true });
  });
});
