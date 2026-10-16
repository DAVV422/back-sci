/**
 * Con APP_PROD=true la API no arranca con secretos de ejemplo o débiles: es preferible caerse al
 * desplegar que quedar expuesta (antes, sin JWT_AUTH, se firmaba con la palabra "secret").
 */
type EnvLike = Record<string, string | undefined>;

const WEAK_SECRETS = new Set(['secret', 'MiclaveSecreta', 'MISegundaClaVeSecreta', 'changeme', 'change_me']);
const WEAK_PASSWORDS = new Set(['change_me_on_production', 'admin', 'admin123', 'password', '12345678']);

export function productionConfigProblems(env: EnvLike = process.env): string[] {
  if (env.APP_PROD !== 'true') return [];
  const problems: string[] = [];
  const secret = (name: string) => {
    const value = env[name];
    if (!value || value.length < 32 || WEAK_SECRETS.has(value)) {
      problems.push(`${name} debe tener al menos 32 caracteres aleatorios (no el valor de ejemplo).`);
    }
  };
  secret('JWT_AUTH');
  if (env.JWT_REFRESH_SECRET) secret('JWT_REFRESH_SECRET');
  if (env.ADMIN_PASSWORD && (env.ADMIN_PASSWORD.length < 12 || WEAK_PASSWORDS.has(env.ADMIN_PASSWORD))) {
    problems.push('ADMIN_PASSWORD debe tener al menos 12 caracteres y no ser el de ejemplo.');
  }
  const origins = (env.CORS_ORIGINS || env.FRONTEND_URL || '').split(',').map(o => o.trim()).filter(Boolean);
  if (!origins.length || origins.includes('*')) {
    problems.push('CORS_ORIGINS (o FRONTEND_URL) debe listar los dominios del front; "*" no se admite en producción.');
  }
  return problems;
}

export function assertProductionConfig(env: EnvLike = process.env): void {
  const problems = productionConfigProblems(env);
  if (problems.length) {
    throw new Error(`Configuración insegura para producción:\n- ${problems.join('\n- ')}`);
  }
}
