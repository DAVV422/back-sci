import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IStorageService } from '../../interfaces/storage.interface';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly baseUploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUploadDir = path.join(process.cwd(), 'data', 'uploads');
  }

  public async saveFile(
    file: Express.Multer.File,
    subfolder = 'profiles',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Formato de imagen no permitido (${file.mimetype}). Solo se permiten: JPEG, PNG y WebP.`,
      );
    }

    const targetDir = path.join(this.baseUploadDir, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `profile_${randomUUID()}${ext}`;
    const destinationPath = path.join(targetDir, filename);

    if (file.buffer) {
      fs.writeFileSync(destinationPath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, destinationPath);
    } else {
      throw new BadRequestException('El archivo no contiene datos válidos.');
    }

    this.logger.log(
      `[saveFile] Archivo almacenado exitosamente en: ${destinationPath}`,
    );

    // Retorna la ruta relativa que se sirve mediante el endpoint GET /api/user/image/:filename
    return `/api/user/image/${filename}`;
  }

  public async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
      const filename = path.basename(fileUrl);
      const filePath = path.join(this.baseUploadDir, 'profiles', filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`[deleteFile] Archivo eliminado: ${filePath}`);
      }
    } catch (error: any) {
      this.logger.warn(
        `[deleteFile] No se pudo eliminar el archivo (${fileUrl}): ${error.message}`,
      );
    }
  }

  public getFilePath(filename: string, subfolder = 'profiles'): string {
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.baseUploadDir, subfolder, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('La imagen solicitada no existe.');
    }

    return filePath;
  }
}
