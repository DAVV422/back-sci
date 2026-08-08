import { pinoHttpOptions } from './logger.config';

describe('logger.config - logging estructurado (F1-021)', () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('redacta campos sensibles: authorization y password', () => {
    const options = pinoHttpOptions();
    expect(options.redact).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.body.password',
      ]),
    );
  });

  it('usa pino-pretty en desarrollo (NODE_ENV !== production)', () => {
    process.env.NODE_ENV = 'development';
    const options = pinoHttpOptions();
    expect(options.transport).toEqual({
      target: 'pino-pretty',
      options: { colorize: true },
    });
  });

  it('emite JSON puro en producción (sin transport)', () => {
    process.env.NODE_ENV = 'production';
    const options = pinoHttpOptions();
    expect(options.transport).toBeUndefined();
  });

  it('reutiliza el traceId del request o genera uno nuevo', () => {
    const options = pinoHttpOptions();
    const res: any = {};
    const req: any = { traceId: 'trace-123' };
    const reqWithoutTrace: any = {};
    expect(options.genReqId(req, res)).toBe('trace-123');
    expect(options.genReqId(reqWithoutTrace, res)).toBeTruthy();
  });
});
