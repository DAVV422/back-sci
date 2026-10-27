import { BadRequestException } from '@nestjs/common';

/**
 * "Mapa de zonas afectadas" y rutas del SCI-201: el recorte del mapa que muestra el incidente,
 * las zonas afectadas dentro de él y las rutas de ingreso y egreso dibujadas. Se guarda como JSON
 * en `form201.affected_areas_map`; los textos `entryRoute`/`egressRoute` quedan como complemento
 * (calles, referencias). Coordenadas en grados decimales (WGS84), como en el resto del sistema.
 */
export interface MapPoint {
  lat: number;
  lng: number;
}

/** Rectángulo del recorte, en grados. */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface AffectedZone {
  id: string;
  /** Vértices en orden, sin repetir el primero al final. */
  points: MapPoint[];
  label?: string;
}

export interface AffectedAreasMap {
  frame: MapBounds | null;
  zones: AffectedZone[];
  /** Trazados en orden de recorrido: del acceso hacia el incidente (ingreso) y hacia afuera (egreso). */
  entryRoute: MapPoint[];
  egressRoute: MapPoint[];
}

export const AFFECTED_AREAS_MAP_LIMITS = { zones: 20, zonePoints: 200, routePoints: 300, label: 80 } as const;

const round = (n: number) => Math.round(n * 1e6) / 1e6;

function point(value: any, where: string): MapPoint {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new BadRequestException(`Coordenada inválida en ${where}.`);
  }
  return { lat: round(lat), lng: round(lng) };
}

function bounds(value: any): MapBounds | null {
  if (value === null || value === undefined) return null;
  const north = Number(value?.north);
  const south = Number(value?.south);
  const east = Number(value?.east);
  const west = Number(value?.west);
  const valid =
    [north, south, east, west].every(Number.isFinite) &&
    Math.abs(north) <= 90 && Math.abs(south) <= 90 && Math.abs(east) <= 180 && Math.abs(west) <= 180 &&
    north > south && east !== west;
  if (!valid) throw new BadRequestException('El recorte del mapa de zonas afectadas no es válido.');
  return { north: round(north), south: round(south), east: round(east), west: round(west) };
}

function route(value: unknown, name: string): MapPoint[] {
  const list = value ?? [];
  if (!Array.isArray(list)) throw new BadRequestException(`La ${name} debe ser una lista de puntos.`);
  if (list.length > AFFECTED_AREAS_MAP_LIMITS.routePoints) {
    throw new BadRequestException(`La ${name} admite hasta ${AFFECTED_AREAS_MAP_LIMITS.routePoints} puntos.`);
  }
  if (list.length === 1) throw new BadRequestException(`La ${name} necesita al menos 2 puntos.`);
  return list.map((p, i) => point(p, `el punto ${i + 1} de la ${name}`));
}

/** Valida y limpia el mapa recibido: descarta campos desconocidos y acota tamaños. */
export function normalizeAffectedAreasMap(input: unknown): AffectedAreasMap | null {
  if (input === null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('El mapa de zonas afectadas debe ser un objeto.');
  }
  const raw = input as { frame?: unknown; zones?: unknown; entryRoute?: unknown; egressRoute?: unknown };
  const zonesIn = raw.zones ?? [];
  if (!Array.isArray(zonesIn)) throw new BadRequestException('Las zonas afectadas deben ser una lista.');
  if (zonesIn.length > AFFECTED_AREAS_MAP_LIMITS.zones) {
    throw new BadRequestException(`El mapa admite hasta ${AFFECTED_AREAS_MAP_LIMITS.zones} zonas afectadas.`);
  }

  const ids = new Set<string>();
  const zones = zonesIn.map((z: any, i) => {
    const where = `la zona ${i + 1}`;
    const id = String(z?.id ?? '').slice(0, 64);
    if (!id || ids.has(id)) throw new BadRequestException(`Identificador faltante o repetido en ${where}.`);
    ids.add(id);
    const pointsIn = z?.points;
    if (!Array.isArray(pointsIn) || pointsIn.length < 3) {
      throw new BadRequestException(`${where[0].toUpperCase()}${where.slice(1)} necesita al menos 3 vértices.`);
    }
    if (pointsIn.length > AFFECTED_AREAS_MAP_LIMITS.zonePoints) {
      throw new BadRequestException(`Cada zona admite hasta ${AFFECTED_AREAS_MAP_LIMITS.zonePoints} vértices.`);
    }
    const label = typeof z?.label === 'string' ? z.label.trim().slice(0, AFFECTED_AREAS_MAP_LIMITS.label) : '';
    return { id, points: pointsIn.map((p, j) => point(p, `el vértice ${j + 1} de ${where}`)), ...(label ? { label } : {}) };
  });

  return {
    frame: bounds(raw.frame),
    zones,
    entryRoute: route(raw.entryRoute, 'ruta de ingreso'),
    egressRoute: route(raw.egressRoute, 'ruta de egreso'),
  };
}

/** Una ruta cuenta como registrada si tiene texto o un trazado en el mapa. */
export function hasRoute(text: string | null | undefined, map: AffectedAreasMap | null | undefined, key: 'entryRoute' | 'egressRoute'): boolean {
  return !!text?.trim() || (map?.[key]?.length ?? 0) >= 2;
}
