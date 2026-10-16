import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';
import { audioKey, audioKeyFromPath, croquisKey, profileKey, storageKey, uniqueFileName } from './storage-keys';

describe('LocalStorageService (disco)', () => {
  let root: string;
  let storage: LocalStorageService;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sci-storage-'));
    storage = new LocalStorageService({ get: (k: string) => (k === 'STORAGE_LOCAL_ROOT' ? root : undefined) } as any);
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const read = async (key: string) => {
    const { stream, size } = await storage.get(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return { body: Buffer.concat(chunks).toString(), size };
  };

  it('guarda, lee, comprueba y borra por clave dentro de la raíz configurada', async () => {
    const key = croquisKey('croquis_1.png');
    await storage.put(key, Buffer.from('hola'));

    expect(fs.existsSync(path.join(root, 'uploads', 'croquis', 'croquis_1.png'))).toBe(true);
    await expect(storage.exists(key)).resolves.toBe(true);
    await expect(read(key)).resolves.toEqual({ body: 'hola', size: 4 });

    await storage.delete(key);
    await expect(storage.exists(key)).resolves.toBe(false);
    await expect(storage.delete(key)).resolves.toBeUndefined(); // borrar dos veces no falla
  });

  it('un archivo inexistente da 404', async () => {
    await expect(storage.get(profileKey('nada.png'))).rejects.toThrow(NotFoundException);
  });

  it('no permite salir de la raíz con claves manipuladas', async () => {
    for (const key of ['../fuera.txt', 'uploads/../../fuera.txt', '/etc/passwd', 'uploads//x', 'uploads/.env']) {
      await expect(storage.put(key, Buffer.from('x'))).rejects.toThrow(BadRequestException);
    }
    expect(fs.existsSync(path.join(root, '..', 'fuera.txt'))).toBe(false);
  });

  it('sin STORAGE_LOCAL_ROOT usa <cwd>/data (estructura existente)', () => {
    const fallback = new LocalStorageService({ get: () => undefined } as any);
    expect(fallback.root).toBe(path.resolve(process.cwd(), 'data'));
  });
});

describe('storage-keys', () => {
  it('arma las claves de cada tipo de archivo', () => {
    expect(profileKey('profile_1.png')).toBe('uploads/profiles/profile_1.png');
    expect(profileKey('../../x.png')).toBe('uploads/profiles/x.png');
    expect(audioKey('u-1', 'e-1', 'audio_1.m4a')).toBe('audios/u-1/e-1/audio_1.m4a');
    expect(() => audioKey('u-1', '../e', 'a.m4a')).toThrow(BadRequestException);
    expect(() => storageKey('a b')).toThrow(BadRequestException);
  });

  it('acepta las rutas antiguas de audio (data/audios/...) y rechaza las de otra carpeta', () => {
    expect(audioKeyFromPath('data/audios/u-1/e-1/audio_1.m4a')).toBe('audios/u-1/e-1/audio_1.m4a');
    expect(audioKeyFromPath('audios/u-1/e-1/audio_1.m4a')).toBe('audios/u-1/e-1/audio_1.m4a');
    expect(() => audioKeyFromPath('data/uploads/profiles/x.png')).toThrow(BadRequestException);
    expect(() => audioKeyFromPath('data/audios/../../.env')).toThrow(BadRequestException);
  });

  it('el nombre nuevo no conserva lo que mandó el cliente salvo una extensión simple', () => {
    expect(uniqueFileName('audio', 'nota.M4A', '.m4a')).toMatch(/^audio_[0-9a-f-]{36}\.m4a$/);
    expect(uniqueFileName('croquis', 'x.php.png', '.png')).toMatch(/^croquis_[0-9a-f-]{36}\.png$/);
    expect(uniqueFileName('croquis', 'sin-extension', '.png')).toMatch(/\.png$/);
  });
});
