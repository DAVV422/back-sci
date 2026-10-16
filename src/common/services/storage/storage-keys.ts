import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

/**
 * Arma una clave de almacenamiento a partir de segmentos. Cada segmento debe ser un nombre
 * simple (sin `/`, `\`, `..` ni espacios): así ni un nombre de archivo ni un id del cliente
 * pueden apuntar fuera de su carpeta.
 */
export function storageKey(...segments: string[]): string {
  for (const segment of segments) {
    if (!SEGMENT.test(segment ?? '') || segment.includes('..')) {
      throw new BadRequestException('Nombre de archivo inválido.');
    }
  }
  return segments.join('/');
}

/** Valida una clave ya armada (p. ej. leída de la base) y la devuelve normalizada. */
export function assertStorageKey(key: string): string {
  return storageKey(...String(key ?? '').split('/'));
}

/** Nombre nuevo, único y con la extensión normalizada (la del cliente no se usa tal cual). */
export function uniqueFileName(prefix: string, originalName: string | undefined, fallbackExt: string): string {
  const ext = path.extname(originalName ?? '').toLowerCase();
  const safeExt = /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : fallbackExt;
  return `${prefix}_${randomUUID()}${safeExt}`;
}

// --- Carpetas de cada tipo de archivo. Coinciden con la estructura ya existente en `data/`. ---

export const PROFILE_FOLDER = ['uploads', 'profiles'] as const;
export const CROQUIS_FOLDER = ['uploads', 'croquis'] as const;
export const AUDIO_FOLDER = 'audios';

/** Foto de perfil: `urlImage` se guarda como `/api/user/image/<archivo>`. */
export const profileImageUrl = (fileName: string) => `/api/user/image/${fileName}`;
export const profileKey = (fileName: string) => storageKey(...PROFILE_FOLDER, path.basename(fileName ?? ''));
export const croquisKey = (fileName: string) => storageKey(...CROQUIS_FOLDER, fileName);
export const audioKey = (userId: string, emergencyId: string, fileName: string) =>
  storageKey(AUDIO_FOLDER, userId, emergencyId, fileName);

/**
 * `audio.path_audio` guardaba la ruta relativa al proceso (`data/audios/...`); ahora guarda la
 * clave (`audios/...`). Se aceptan ambas para no migrar los registros existentes.
 */
export function audioKeyFromPath(pathAudio: string): string {
  const normalized = String(pathAudio ?? '').replace(/\\/g, '/').replace(/^data\//, '');
  const key = assertStorageKey(normalized);
  if (!key.startsWith(`${AUDIO_FOLDER}/`)) throw new BadRequestException('Ruta de audio inválida.');
  return key;
}
