/**
 * Política de fechas y horas del sistema:
 * - Todo se **guarda en UTC**. Este módulo fija la zona horaria del proceso Node en UTC, así que
 *   `new Date()`, `getHours()` y las columnas `timestamp` se leen y escriben en UTC sin importar la
 *   zona del servidor (en un VPS suele ser UTC, en desarrollo la de la máquina).
 * - La **zona horaria de la institución** (`APP_TIMEZONE`, IANA) solo se usa para *mostrar* y
 *   para *agrupar* en reportes. Por defecto Bolivia (`America/La_Paz`, UTC-4, sin horario de verano).
 *
 * Debe importarse antes que cualquier otro módulo (primera línea de `main.ts`).
 */
process.env.TZ = 'UTC';

export const DEFAULT_APP_TIMEZONE = 'America/La_Paz';

export function isValidTimezone(timezone: string | undefined): boolean {
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Zona horaria configurada de la institución; si `APP_TIMEZONE` falta o es inválida, la de Bolivia. */
export function getAppTimezone(): string {
  const configured = process.env.APP_TIMEZONE?.trim();
  return isValidTimezone(configured) ? configured : DEFAULT_APP_TIMEZONE;
}

/** Desfase de una zona respecto de UTC en un instante, como `-04:00`. */
export function utcOffsetOf(timezone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  }).formatToParts(at);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  return name === 'GMT' ? '+00:00' : name.replace('GMT', '');
}
