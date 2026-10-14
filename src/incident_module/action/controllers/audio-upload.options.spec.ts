import { BadRequestException } from '@nestjs/common';

import { AUDIO_MAX_BYTES, audioFileFilter, audioUploadOptions } from './audio-upload.options';

describe('audioUploadOptions', () => {
  const EMERGENCY_ID = '01b9bbf4-41a6-4820-abd4-9df61a2d6356';

  const run = (params: Record<string, string>, file: { originalname: string; mimetype: string }) => {
    const cb = jest.fn();
    audioFileFilter({ params } as any, file as any, cb);
    return cb;
  };

  it('limita el tamaño y la cantidad de archivos', () => {
    expect(audioUploadOptions.limits).toEqual({ fileSize: AUDIO_MAX_BYTES, files: 1 });
    expect(AUDIO_MAX_BYTES).toBe(25 * 1024 * 1024);
  });

  it.each([
    ['nota.m4a', 'audio/mp4'],
    ['nota.AAC', 'audio/aac'],
    ['nota.webm', 'video/webm'],
    ['nota.m4a', 'application/octet-stream'],
  ])('acepta %s (%s)', (originalname, mimetype) => {
    expect(run({ emergencyId: EMERGENCY_ID }, { originalname, mimetype })).toHaveBeenCalledWith(null, true);
  });

  it.each([
    ['script.php', 'audio/mp4'],
    ['foto.png', 'image/png'],
    ['nota.m4a', 'text/html'],
    ['sin-extension', 'audio/mp4'],
  ])('rechaza %s (%s)', (originalname, mimetype) => {
    const cb = run({ emergencyId: EMERGENCY_ID }, { originalname, mimetype });
    expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
  });

  it('rechaza un emergencyId que no es UUID (multer corre antes del ParseUUIDPipe)', () => {
    const cb = run({ emergencyId: '..' }, { originalname: 'nota.m4a', mimetype: 'audio/mp4' });
    expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
  });
});
