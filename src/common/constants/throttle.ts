/**
 * Límites de rate limiting configurables por entorno. Se resuelven en cada request (después de
 * que ConfigModule cargó el .env), así que no dependen del orden de evaluación de decoradores.
 * Sin variable definida: 300/min global (se cuenta por IP y en terreno muchos usuarios comparten
 * una misma IP pública) y los límites estrictos de SPEC-F1-005 en autenticación.
 */
const fromEnv =
  (envKey: string, fallback: number) => (): number => {
    const value = Number(process.env[envKey]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

/** Límite global por IP y minuto para toda la API. */
export const globalThrottleLimit = fromEnv('THROTTLE_LIMIT', 300);

/** Límite por IP y minuto de un endpoint de autenticación (login, refresh, activación). */
export const authThrottleLimit = (fallback: number) => fromEnv('THROTTLE_AUTH_LIMIT', fallback);
