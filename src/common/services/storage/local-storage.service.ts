import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService, StoredObject } from '../../interfaces/storage.interface';
import { assertStorageKey } from './storage-keys';

/**
 * `IStorageService` sobre disco. La raíz es `STORAGE_LOCAL_ROOT` (por defecto `<cwd>/data`), así
 * el E2E y otros entornos usan su propia carpeta sin mezclar archivos con los de desarrollo.
 */
@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  readonly root: string;

  constructor(configService: ConfigService) {
    const configured = configService.get<string>('STORAGE_LOCAL_ROOT');
    this.root = path.resolve(configured || path.join(process.cwd(), 'data'));
  }

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolve(key);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, data);
    this.logger.log(`[put] ${key} (${data.length} bytes)`);
  }

  async get(key: string): Promise<StoredObject> {
    const filePath = this.resolve(key);
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat?.isFile()) throw new NotFoundException('El archivo solicitado no existe.');
    return { stream: fs.createReadStream(filePath), size: stat.size };
  }

  async exists(key: string): Promise<boolean> {
    const stat = await fs.promises.stat(this.resolve(key)).catch(() => null);
    return !!stat?.isFile();
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.promises.unlink(this.resolve(key));
      this.logger.log(`[delete] ${key}`);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') this.logger.warn(`[delete] No se pudo eliminar ${key}: ${error?.message}`);
    }
  }

  /** Clave → ruta en disco, comprobando que quede dentro de la raíz. */
  private resolve(key: string): string {
    const filePath = path.resolve(this.root, assertStorageKey(key));
    if (!filePath.startsWith(this.root + path.sep)) throw new NotFoundException('El archivo solicitado no existe.');
    return filePath;
  }
}
