import { APP_GUARD } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';

import { AuthController } from '../../src/auth/controllers/auth.controller';
import { AuthService } from '../../src/auth/services/auth.service';
import { UserService } from '../../src/user/services/user.service';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { TraceIdMiddleware } from '../../src/common/middleware/trace-id.middleware';

describe('Rate limiting on auth endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockResolvedValue({
              accessToken: 'fake-token',
              user: { id: 'uuid' },
            }),
          },
        },
        { provide: UserService, useValue: {} },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(new TraceIdMiddleware().use);
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/login allows 5 requests and returns 429 on the 6th', async () => {
    const httpServer = app.getHttpServer();

    for (let i = 1; i <= 5; i += 1) {
      const res = await request(httpServer)
        .post('/api/login')
        .send({ email: 'john@live.com', password: '123456' });
      expect(res.status).not.toBe(429);
    }

    const throttled = await request(httpServer)
      .post('/api/login')
      .send({ email: 'john@live.com', password: '123456' });
    expect(throttled.status).toBe(429);
    expect(throttled.body.success).toBe(false);
    expect(throttled.body.statusCode).toBe(429);
    expect(typeof throttled.body.traceId).toBe('string');
    expect(typeof throttled.body.timestamp).toBe('string');
  });
});
