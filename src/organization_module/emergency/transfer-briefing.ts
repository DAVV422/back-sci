/**
 * Lista de transferencia de mando del manual SCI (paso 8 del primer respondedor): la entrega se
 * hace en persona, con el SCI-201 completo, y debe cubrir estos temas. El CI saliente confirma
 * cada uno al traspasar (decisión 2026-10-16: confirma solo quien entrega) y queda en la bitácora.
 */
export const TRANSFER_BRIEFING_ITEMS = {
  incident_status: 'Estado del incidente: qué pasó, qué se logró, qué falta y qué se necesita',
  safety: 'Situación actual de seguridad',
  objectives: 'Objetivos, estrategias y tácticas',
  organization: 'Organización actual',
  resource_assignment: 'Asignación de recursos',
  resources_en_route: 'Recursos solicitados y en camino',
  facilities: 'Instalaciones establecidas',
  communications: 'Plan de comunicaciones',
  probable_evolution: 'Probable evolución',
  in_person: 'Entrega en persona, con el SCI-201 completo',
} as const;

export type TransferBriefingItem = keyof typeof TRANSFER_BRIEFING_ITEMS;
export const TRANSFER_BRIEFING_KEYS = Object.keys(TRANSFER_BRIEFING_ITEMS) as TransferBriefingItem[];

/** Temas de la lista que faltan confirmar. */
export function missingBriefingItems(confirmed: readonly string[] | undefined): TransferBriefingItem[] {
  const given = new Set(confirmed ?? []);
  return TRANSFER_BRIEFING_KEYS.filter((key) => !given.has(key));
}
