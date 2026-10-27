/** Vistas de Google Maps que el usuario puede elegir como predeterminada. */
export const MAP_TYPES = ['roadmap', 'hybrid'] as const;
export type MapType = (typeof MAP_TYPES)[number];
