import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import * as path from 'path';

/** Una foto de un croquis a mano o una captura de mapa: 10 MB sobra. */
export const CROQUIS_MAX_BYTES = 10 * 1024 * 1024;
export const CROQUIS_ALLOWED = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
} as const;

export const croquisUploadOptions: MulterOptions = {
  limits: { fileSize: CROQUIS_MAX_BYTES, files: 1 },
  storage: memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname ?? '').toLowerCase() as keyof typeof CROQUIS_ALLOWED;
    if (!CROQUIS_ALLOWED[ext] || CROQUIS_ALLOWED[ext] !== (file.mimetype ?? '').toLowerCase()) {
      return cb(new BadRequestException('El croquis debe ser una imagen JPG, PNG o WebP.'), false);
    }
    cb(null, true);
  },
};

/** Firma real del archivo: el MIME lo declara el cliente y no basta. */
export function isImageBuffer(buffer: Buffer | undefined): boolean {
  if (!buffer || buffer.length < 12) return false;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return png || jpeg || webp;
}
