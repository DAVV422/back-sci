import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { isUUID } from 'class-validator';

/** Tamaño máximo de una nota de voz. Una nota de 10 min en AAC/M4A ronda los 5-10 MB. */
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024;

/** Formatos que graban los teléfonos (Android/iOS) y los navegadores. */
export const AUDIO_ALLOWED_EXTENSIONS = ['.m4a', '.aac', '.mp3', '.wav', '.ogg', '.oga', '.opus', '.webm', '.3gp', '.amr'];

export const AUDIO_ROOT = path.join(process.cwd(), 'data', 'audios');

/**
 * Multer corre antes que los pipes de la ruta: el `emergencyId` y el nombre del archivo llegan
 * sin validar. Por eso se valida aquí el UUID (la ruta en disco se arma con él) y se acepta solo
 * una lista blanca de extensiones de audio, con la extensión normalizada al guardar.
 */
export const audioFileFilter: MulterOptions['fileFilter'] = (req: any, file, cb) => {
  if (!isUUID(req.params?.emergencyId)) {
    return cb(new BadRequestException('Identificador de emergencia inválido.'), false);
  }
  const ext = path.extname(file.originalname ?? '').toLowerCase();
  const mime = (file.mimetype ?? '').toLowerCase();
  // Algunos clientes móviles envían application/octet-stream: en ese caso decide la extensión.
  const mimeOk = mime.startsWith('audio/') || mime === 'video/webm' || mime === 'video/3gpp' || mime === 'application/octet-stream';
  if (!AUDIO_ALLOWED_EXTENSIONS.includes(ext) || !mimeOk) {
    return cb(
      new BadRequestException(`Formato de audio no admitido. Formatos válidos: ${AUDIO_ALLOWED_EXTENSIONS.join(', ')}.`),
      false,
    );
  }
  cb(null, true);
};

export const audioUploadOptions: MulterOptions = {
  limits: { fileSize: AUDIO_MAX_BYTES, files: 1 },
  fileFilter: audioFileFilter,
  storage: diskStorage({
    destination: (req: any, _file, cb) => {
      // userId viene del AuthGuard (UUID del token); emergencyId ya fue validado en fileFilter.
      const uploadPath = path.join(AUDIO_ROOT, String(req.user?.id), String(req.params.emergencyId));
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      cb(null, `audio_${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
};
