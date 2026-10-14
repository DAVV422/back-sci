import { DEFAULT_APP_TIMEZONE, getAppTimezone, isValidTimezone, utcOffsetOf } from './timezone';

describe('config/timezone', () => {
  const original = process.env.APP_TIMEZONE;
  afterEach(() => {
    if (original === undefined) delete process.env.APP_TIMEZONE;
    else process.env.APP_TIMEZONE = original;
  });

  it('fija el proceso en UTC: todo lo que genera el servidor queda en UTC', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(new Date(Date.UTC(2026, 9, 3, 23, 30)).getHours()).toBe(23);
  });

  it('por defecto usa la zona de Bolivia', () => {
    delete process.env.APP_TIMEZONE;
    expect(getAppTimezone()).toBe(DEFAULT_APP_TIMEZONE);
    expect(DEFAULT_APP_TIMEZONE).toBe('America/La_Paz');
  });

  it('respeta APP_TIMEZONE válida y descarta una inválida', () => {
    process.env.APP_TIMEZONE = 'America/Lima';
    expect(getAppTimezone()).toBe('America/Lima');
    process.env.APP_TIMEZONE = 'Marte/Olympus';
    expect(getAppTimezone()).toBe(DEFAULT_APP_TIMEZONE);
    expect(isValidTimezone(undefined)).toBe(false);
  });

  it('calcula el desfase: Bolivia es UTC-4 todo el año', () => {
    expect(utcOffsetOf('America/La_Paz', new Date('2026-01-15T12:00:00Z'))).toBe('-04:00');
    expect(utcOffsetOf('America/La_Paz', new Date('2026-07-15T12:00:00Z'))).toBe('-04:00');
    expect(utcOffsetOf('UTC')).toBe('+00:00');
  });
});
