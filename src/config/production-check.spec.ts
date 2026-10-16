import { assertProductionConfig, productionConfigProblems } from './production-check';

describe('production-check', () => {
  const strong = 'k'.repeat(16) + 'Z9x!'.repeat(5);
  const ok = { APP_PROD: 'true', JWT_AUTH: strong, ADMIN_PASSWORD: 'Una-Clave-Larga-2026', CORS_ORIGINS: 'https://sci.bo' };

  it('fuera de producción no exige nada', () => {
    expect(productionConfigProblems({ APP_PROD: 'false' })).toEqual([]);
  });

  it('con una configuración sólida arranca', () => {
    expect(() => assertProductionConfig(ok)).not.toThrow();
  });

  it.each([
    ['sin JWT_AUTH', { JWT_AUTH: undefined }, 'JWT_AUTH'],
    ['JWT_AUTH de ejemplo', { JWT_AUTH: 'MiclaveSecreta' }, 'JWT_AUTH'],
    ['JWT_AUTH corto', { JWT_AUTH: 'abc123' }, 'JWT_AUTH'],
    ['JWT_REFRESH_SECRET corto', { JWT_REFRESH_SECRET: 'x' }, 'JWT_REFRESH_SECRET'],
    ['contraseña de admin de ejemplo', { ADMIN_PASSWORD: 'change_me_on_production' }, 'ADMIN_PASSWORD'],
    ['CORS abierto', { CORS_ORIGINS: '*' }, 'CORS_ORIGINS'],
    ['sin CORS ni FRONTEND_URL', { CORS_ORIGINS: undefined }, 'CORS_ORIGINS'],
  ])('%s: no arranca', (_case, override, variable) => {
    expect(() => assertProductionConfig({ ...ok, ...override } as any)).toThrow(variable);
  });
});
