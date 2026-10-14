import { BadRequestException } from '@nestjs/common';

/**
 * Página 2 del SCI-201 ("Mapa o croquis", casilla 12): perímetro de seguridad, instalaciones
 * y recursos con los símbolos del manual (Anexo D). Se guarda como JSON en `form201.situation_map`.
 * Las coordenadas van en grados decimales (WGS84), como en el resto del sistema.
 */
export const SITUATION_MAP_SYMBOLS = [
  'command_post', // PC
  'staging_area', // E
  'casualty_area', // ACV
  'base', // B
  'camp', // C
  'helibase', // H
  'helispot', // H1, H2…
  'incident_origin', // origen del incidente
  'hazard', // peligro (identificar tipo)
  'first_aid', // estación de primeros auxilios
  'water_source', // fuente de agua
  'resource', // ubicación de un recurso
  'other',
] as const;
export type SituationMapSymbol = (typeof SITUATION_MAP_SYMBOLS)[number];

export interface SituationMapPoint {
  lat: number;
  lng: number;
}

export interface SituationMapElement extends SituationMapPoint {
  id: string;
  symbol: SituationMapSymbol;
  label?: string;
}

export interface SituationMap {
  /** Perímetro de seguridad: vértices en orden, sin repetir el primero al final. */
  perimeter: SituationMapPoint[];
  elements: SituationMapElement[];
}

export const SITUATION_MAP_LIMITS = { perimeterPoints: 200, elements: 150, label: 80 } as const;

function point(value: any, where: string): SituationMapPoint {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new BadRequestException(`Coordenada inválida en ${where}.`);
  }
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

/** Valida y limpia el mapa recibido: descarta campos desconocidos y acota tamaños. */
export function normalizeSituationMap(input: unknown): SituationMap | null {
  if (input === null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('El mapa de situación debe ser un objeto.');
  }
  const raw = input as { perimeter?: unknown; elements?: unknown };
  const perimeterIn = raw.perimeter ?? [];
  const elementsIn = raw.elements ?? [];
  if (!Array.isArray(perimeterIn) || !Array.isArray(elementsIn)) {
    throw new BadRequestException('El perímetro y los elementos del mapa deben ser listas.');
  }
  if (perimeterIn.length > SITUATION_MAP_LIMITS.perimeterPoints) {
    throw new BadRequestException(`El perímetro admite hasta ${SITUATION_MAP_LIMITS.perimeterPoints} vértices.`);
  }
  if (perimeterIn.length > 0 && perimeterIn.length < 3) {
    throw new BadRequestException('El perímetro necesita al menos 3 vértices.');
  }
  if (elementsIn.length > SITUATION_MAP_LIMITS.elements) {
    throw new BadRequestException(`El mapa admite hasta ${SITUATION_MAP_LIMITS.elements} elementos.`);
  }

  const perimeter = perimeterIn.map((p, i) => point(p, `el vértice ${i + 1} del perímetro`));
  const ids = new Set<string>();
  const elements = elementsIn.map((e: any, i) => {
    const where = `el elemento ${i + 1}`;
    if (!SITUATION_MAP_SYMBOLS.includes(e?.symbol)) {
      throw new BadRequestException(`Símbolo desconocido en ${where}.`);
    }
    const id = String(e?.id ?? '').slice(0, 64);
    if (!id || ids.has(id)) throw new BadRequestException(`Identificador faltante o repetido en ${where}.`);
    ids.add(id);
    const label = typeof e?.label === 'string' ? e.label.trim().slice(0, SITUATION_MAP_LIMITS.label) : '';
    return { id, symbol: e.symbol as SituationMapSymbol, ...point(e, where), ...(label ? { label } : {}) };
  });
  return { perimeter, elements };
}
