import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { isUUID } from 'class-validator';

/** Tamaño máximo de una nota de voz. Una nota de 10 min en AAC/M4A ronda los 5-10 MB. */
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024;

/** Formatos que graban los teléfonos (Android/iOS) y los navegadores. */
export const AUDIO_ALLOWED_EXTENSIONS = ['.m4a', '.aac', '.mp3', '.wav', '.ogg', '.oga', '.opus', '.webm', '.3gp', '.amr'];

/** Extensión ya validada por `audioFileFilter`, en minúsculas. */
export const AUDIO_EXTENSION = (file: Express.Multer.File): string => {
  const ext = path.extname(file?.originalname ?? '').toLowerCase();
  return AUDIO_ALLOWED_EXTENSIONS.includes(ext) ? ext : '.m4a';
};

/**
 * Multer corre antes que los pipes de la ruta: el `emergencyId` y el nombre del archivo llegan
 * sin validar. Por eso se valida aquí el UUID (forma parte de la clave en el almacenamiento) y se
 * acepta solo una lista blanca de extensiones de audio.
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

/**
 * En memoria: el controlador lo guarda en el almacenamiento (`IStorageService`), que hoy es el
 * disco y mañana puede ser S3, en lugar de que multer escriba directo en una carpeta local.
 */
export const audioUploadOptions: MulterOptions = {
  limits: { fileSize: AUDIO_MAX_BYTES, files: 1 },
  fileFilter: audioFileFilter,
  storage: memoryStorage(),
};
