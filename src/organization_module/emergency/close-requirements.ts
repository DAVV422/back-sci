import { EmergencyEntity } from './entities/emergency.entity';

/** Tipo que toma una emergencia registrada sin tipo; al finalizarla se pide uno real. */
export const UNCLASSIFIED_TYPE = 'Sin clasificar';

/** Pestaña del Centro de Mando donde se completa lo que falta. */
export type CloseBlockerTab = 'header' | 'assessment' | 'form201';

/** Lo que falta en una parte de la emergencia para poder finalizarla. */
export interface CloseBlocker {
  readonly section: string;
  readonly tab: CloseBlockerTab;
  readonly missing: readonly string[];
}

const blank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** Campos del 201 que deben estar completos al cierre, con su nombre en el formulario. */
const FORM201_FIELDS: readonly [string, string][] = [
  ['nature', 'Naturaleza'],
  ['thread', 'Amenazas'],
  ['affectedArea', 'Área afectada'],
  ['objectives', 'Objetivos'],
  ['strategies', 'Estrategias'],
  ['tactics', 'Tácticas'],
  ['entryRoute', 'Ruta de ingreso'],
  ['egressRoute', 'Ruta de egreso'],
  ['communicationsChannel', 'Canales de comunicación'],
  ['safetyMessage', 'Mensaje de seguridad'],
];

/**
 * Durante la emergencia casi nada es obligatorio (en terreno los segundos cuentan); al finalizarla
 * sí se exige lo esencial del registro: datos de la emergencia, evaluación inicial y cada 201
 * completo. Necesita `initialAssessment` y `form201` cargados.
 */
export function findCloseBlockers(emergency: EmergencyEntity): CloseBlocker[] {
  const blockers: CloseBlocker[] = [];

  const data: string[] = [];
  if (blank(emergency.type) || emergency.type === UNCLASSIFIED_TYPE) data.push('Tipo de emergencia');
  if (blank(emergency.location_description) && !emergency.coordinates?.length) data.push('Lugar (descripción o punto en el mapa)');
  if (data.length) blockers.push({ section: 'Datos de la emergencia', tab: 'header', missing: data });

  const a = emergency.initialAssessment;
  if (!a) {
    blockers.push({ section: 'Evaluación inicial', tab: 'assessment', missing: ['Registrar la evaluación inicial'] });
  } else {
    const missing = [
      ...(blank(a.hazard_type) ? ['Tipo de peligro'] : []),
      ...(blank(a.severity_level) ? ['Nivel de severidad'] : []),
      ...(blank(a.situation_description) ? ['Descripción de la situación'] : []),
    ];
    if (missing.length) blockers.push({ section: 'Evaluación inicial', tab: 'assessment', missing });
  }

  const forms = (emergency.form201 ?? []).filter((f) => !f.isDeleted).sort((x, y) => x.code.localeCompare(y.code));
  if (!forms.length) {
    blockers.push({ section: 'Formulario 201', tab: 'form201', missing: ['Registrar el Formulario 201'] });
  }
  for (const form of forms) {
    const missing = FORM201_FIELDS.filter(([key]) => blank((form as unknown as Record<string, unknown>)[key])).map(([, label]) => label);
    if (missing.length) blockers.push({ section: `Formulario 201 ${form.code}`, tab: 'form201', missing });
  }
  return blockers;
}

/** Texto para el 400 al intentar finalizar con datos faltantes. */
export function describeCloseBlockers(blockers: readonly CloseBlocker[]): string {
  return `Para finalizar la emergencia falta completar: ${blockers.map((b) => `${b.section}: ${b.missing.join(', ')}`).join('; ')}.`;
}
