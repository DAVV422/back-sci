import { BadRequestException } from '@nestjs/common';
import { hasRoute, normalizeAffectedAreasMap } from './affected-areas-map';

describe('normalizeAffectedAreasMap', () => {
  const frame = { north: -17.38, south: -17.4, east: -66.15, west: -66.17 };

  it('null borra el mapa', () => {
    expect(normalizeAffectedAreasMap(null)).toBeNull();
  });

  it('limpia, redondea y descarta campos desconocidos', () => {
    const result = normalizeAffectedAreasMap({
      frame: { ...frame, extra: 1 },
      zones: [{ id: 'z1', label: '  Ladera norte  ', points: [{ lat: -17.381234567, lng: -66.16 }, { lat: -17.39, lng: -66.16 }, { lat: -17.39, lng: -66.155 }], color: 'red' }],
      entryRoute: [{ lat: -17.4, lng: -66.17 }, { lat: -17.39, lng: -66.16 }],
      hack: true,
    });
    expect(result).toEqual({
      frame,
      zones: [{ id: 'z1', label: 'Ladera norte', points: [{ lat: -17.381235, lng: -66.16 }, { lat: -17.39, lng: -66.16 }, { lat: -17.39, lng: -66.155 }] }],
      entryRoute: [{ lat: -17.4, lng: -66.17 }, { lat: -17.39, lng: -66.16 }],
      egressRoute: [],
    });
  });

  it('acepta el mapa vacío', () => {
    expect(normalizeAffectedAreasMap({})).toEqual({ frame: null, zones: [], entryRoute: [], egressRoute: [] });
  });

  it.each([
    ['recorte invertido', { frame: { ...frame, north: -17.5 } }],
    ['ruta con un solo punto', { entryRoute: [{ lat: 1, lng: 1 }] }],
    ['zona con dos vértices', { zones: [{ id: 'a', points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }] }] }],
    ['coordenada fuera de rango', { egressRoute: [{ lat: 95, lng: 1 }, { lat: 1, lng: 1 }] }],
    ['zonas repetidas', { zones: [1, 2].map(() => ({ id: 'a', points: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 1 }] })) }],
    ['lista en lugar de objeto', []],
  ])('rechaza %s', (_, input) => {
    expect(() => normalizeAffectedAreasMap(input)).toThrow(BadRequestException);
  });
});

describe('hasRoute', () => {
  it('cuenta el texto o un trazado de al menos 2 puntos', () => {
    const map = { frame: null, zones: [], entryRoute: [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }], egressRoute: [] };
    expect(hasRoute('Av. Blanco Galindo', null, 'entryRoute')).toBe(true);
    expect(hasRoute('', map, 'entryRoute')).toBe(true);
    expect(hasRoute('  ', map, 'egressRoute')).toBe(false);
    expect(hasRoute(null, undefined, 'egressRoute')).toBe(false);
  });
});
