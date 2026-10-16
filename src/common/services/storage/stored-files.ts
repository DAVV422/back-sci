import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { StoredObject } from '../../interfaces/storage.interface';

export const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** Firma real del archivo: el MIME lo declara el cliente y no basta. */
export function isImageBuffer(buffer: Buffer | undefined): boolean {
  if (!buffer || buffer.length < 12) return false;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return png || jpeg || webp;
}

/** JPG, PNG o WebP de verdad (extensión, MIME declarado y contenido coinciden en ser imagen). */
export function assertImageFile(file: Express.Multer.File | undefined, what: string): void {
  const ext = path.extname(file?.originalname ?? '').toLowerCase();
  if (!file || !IMAGE_TYPES[ext] || IMAGE_TYPES[ext] !== (file.mimetype ?? '').toLowerCase() || !isImageBuffer(file.buffer)) {
    throw new BadRequestException(`${what} debe ser una imagen JPG, PNG o WebP válida.`);
  }
}

/** Tipo de contenido por extensión del archivo guardado (nunca el que mandó el cliente). */
export function contentTypeFor(fileName: string, fallback = 'application/octet-stream'): string {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_TYPES[ext] ?? AUDIO_TYPES[ext] ?? fallback;
}

export const AUDIO_TYPES: Record<string, string> = {
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'audio/webm',
  '.3gp': 'audio/3gpp',
  '.amr': 'audio/amr',
};

/** Envía un archivo del almacenamiento con cabeceras seguras. */
export function sendStoredObject(
  res: Response,
  object: StoredObject,
  options: { contentType: string; fileName?: string; cache?: string },
): void {
  res.setHeader('Content-Type', options.contentType);
  res.setHeader('Content-Length', String(object.size));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', options.cache ?? 'private, max-age=300');
  if (options.fileName) {
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(options.fileName)}"`);
  }
  object.stream.on('error', () => res.destroy());
  object.stream.pipe(res);
}
