import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';

import { AuthGuard, RolesGuard } from '../../src/auth/guards';
import { VictimController } from '../../src/victim_registry_module/victim/controllers/victim.controller';
import { VictimService } from '../../src/victim_registry_module/victim/services/victim.service';
import { VictimEntity } from '../../src/victim_registry_module/victim/entities/victim.entity';
import { UserService } from '../../src/user/services/user.service';
import { ROLES } from '../../src/common/constants';

const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
const victimId = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

describe('Victim (e2e)', () => {
  let app: INestApplication;

  const mockVictim = {
    id: victimId,
    identifier: 'NN-001',
    ageEstimated: 30,
    gender: 'Masculino',
    isDeleted: false,
  };

  const mockUser = {
    id: userId,
    name: 'John',
    last_name: 'Doe',
    role: ROLES.BASIC,
  };

  const mockVictimRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation(async (victim) => ({ id: victimId, isDeleted: false, ...victim })),
    findOne: jest.fn().mockResolvedValue(mockVictim),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserService = {
    findOneAuth: jest.fn().mockResolvedValue(mockUser),
    findOne: jest.fn().mockResolvedValue(mockUser),
  };

  beforeAll(async () => {
    const reflector = new Reflector();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VictimController],
      providers: [
        VictimService,
        { provide: Reflector, useValue: reflector },
        { provide: UserService, useValue: mockUserService },
        { provide: getRepositoryToken(VictimEntity), useValue: mockVictimRepo },
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
    identifier: 'NN-002',
    ageEstimated: 45,
    gender: 'Femenino',
    cellphone: '+56900000000',
    referenceCellphone: '+56911111111',
  };

  it('POST /api/victim without token returns HTTP 401 Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/victim')
      .send(payload);

    expect(res.status).toBe(401);
  });

  it('POST /api/victim successfully creates a victim', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/victim')
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', victimId);
    expect(res.body.data.identifier).toBe('NN-002');
  });

  it('GET /api/victim/:id returns the victim', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/victim/${victimId}`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(victimId);
  });

  it('PATCH /api/victim/:id updates successfully', async () => {
    mockVictimRepo.findOne.mockResolvedValueOnce(mockVictim);
    mockVictimRepo.findOne.mockResolvedValueOnce({ ...mockVictim, ageEstimated: 31 });

    const res = await request(app.getHttpServer())
      .patch(`/api/victim/${victimId}`)
      .set('Authorization', `Bearer ${getAuthToken(ROLES.BASIC)}`)
      .send({ ageEstimated: 31 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ageEstimated).toBe(31);
  });
});
