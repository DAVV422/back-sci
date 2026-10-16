import { Readable } from 'stream';

/** Un archivo leído del almacenamiento, listo para enviarse al cliente. */
export interface StoredObject {
  readonly stream: Readable;
  readonly size: number;
}

/**
 * Almacenamiento de archivos por **clave** (p. ej. `uploads/croquis/croquis_<uuid>.png`,
 * `audios/<userId>/<emergencyId>/audio_<n>.m4a`), sin rutas de disco: es el mismo contrato
 * que un bucket S3 (PutObject / GetObject / HeadObject / DeleteObject). Hoy lo implementa
 * `LocalStorageService` en disco; para S3 basta otro proveedor de `STORAGE_SERVICE`.
 *
 * Las claves se arman con `storageKey()` (ver `storage-keys.ts`), que rechaza `..`, rutas
 * absolutas y caracteres raros, así ningún dato del cliente puede salir de la carpeta.
 */
export interface IStorageService {
  put(key: string, data: Buffer): Promise<void>;
  /** 404 si no existe. */
  get(key: string): Promise<StoredObject>;
  exists(key: string): Promise<boolean>;
  /** No falla si el archivo ya no existe. */
  delete(key: string): Promise<void>;
}
