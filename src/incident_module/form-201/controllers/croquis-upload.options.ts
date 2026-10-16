import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { IMAGE_TYPES } from '../../../common/services/storage/stored-files';

/** Una foto de un croquis a mano o una captura de mapa: 10 MB sobra. */
export const CROQUIS_MAX_BYTES = 10 * 1024 * 1024;

/** Filtro previo por extensión y MIME; la firma real del archivo la valida `assertImageFile`. */
export const croquisUploadOptions: MulterOptions = {
  limits: { fileSize: CROQUIS_MAX_BYTES, files: 1 },
  storage: memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname ?? '').toLowerCase();
    if (!IMAGE_TYPES[ext] || IMAGE_TYPES[ext] !== (file.mimetype ?? '').toLowerCase()) {
      return cb(new BadRequestException('El croquis debe ser una imagen JPG, PNG o WebP.'), false);
    }
    cb(null, true);
  },
};
