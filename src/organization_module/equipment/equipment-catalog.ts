/**
 * Categorías del inventario de equipamiento. Sirven para ordenar el inventario y el despacho;
 * junto con `emergencyTypes` y `generalUse` deciden qué equipo se sugiere en cada emergencia.
 */
export const EQUIPMENT_CATEGORIES = [
  'extincion',
  'rescate',
  'aph',
  'matpel',
  'comunicaciones',
  'epp',
  'logistica',
  'otro',
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
