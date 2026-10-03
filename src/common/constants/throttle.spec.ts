import { authThrottleLimit, globalThrottleLimit } from './throttle';

describe('límites de rate limiting', () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it('sin variables: 300/min global y los límites de SPEC-F1-005 en autenticación', () => {
    delete process.env.THROTTLE_LIMIT;
    delete process.env.THROTTLE_AUTH_LIMIT;
    expect(globalThrottleLimit()).toBe(300);
    expect(authThrottleLimit(5)()).toBe(5);
  });

  it('las variables de entorno los sobrescriben al resolverse', () => {
    process.env.THROTTLE_LIMIT = '300';
    process.env.THROTTLE_AUTH_LIMIT = '50';
    expect(globalThrottleLimit()).toBe(300);
    expect(authThrottleLimit(5)()).toBe(50);
  });

  it('ignora valores inválidos', () => {
    process.env.THROTTLE_LIMIT = 'abc';
    process.env.THROTTLE_AUTH_LIMIT = '0';
    expect(globalThrottleLimit()).toBe(300);
    expect(authThrottleLimit(5)()).toBe(5);
  });
});
