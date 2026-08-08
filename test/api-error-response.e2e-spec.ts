import {
  Body,
  Controller,
  INestApplication,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IsEmail, IsString } from 'class-validator';
import * as request from 'supertest';

import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdMiddleware } from '../src/common/middleware/trace-id.middleware';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('login')
class TestLoginController {
  @Post()
  login(@Body() _body: LoginDto) {
    return { success: true, statusCode: 200, data: { ok: true } };
  }
}

describe('ApiErrorResponse (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestLoginController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(new TraceIdMiddleware().use);
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/login with empty body returns HTTP 400 with full ApiErrorResponse including traceId', () => {
    return request(app.getHttpServer())
      .post('/api/login')
      .send({})
      .expect(400)
      .expect((res) => {
        const body = res.body;
        expect(body.success).toBe(false);
        expect(body.statusCode).toBe(400);
        expect(Array.isArray(body.message)).toBe(true);
        expect(body.message.length).toBeGreaterThan(0);
        expect(typeof body.error).toBe('string');
        expect(typeof body.timestamp).toBe('string');
        expect(typeof body.path).toBe('string');
        expect(body.path).toContain('/api/login');
        expect(typeof body.traceId).toBe('string');
        expect(body.traceId).toHaveLength(36);
      });
  });
});
