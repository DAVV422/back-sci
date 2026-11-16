import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { InstitutionEntity } from '../entities/institution.entity';
import { DEFAULT_INSTITUTION_NAME, InstitutionService } from './institution.service';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let repo: any;
  let storage: any;
  const saved = (over: Partial<InstitutionEntity> = {}) =>
    ({ id: 'inst-1', name: 'Fundación Rescate Urbano', shortName: 'FRU', logoFileName: null, ...over }) as InstitutionEntity;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn().mockResolvedValue(saved()),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'inst-1', ...data })),
    };
    storage = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ stream: null, size: 10 }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionService,
        { provide: getRepositoryToken(InstitutionEntity), useValue: repo },
        { provide: 'STORAGE_SERVICE', useValue: storage },
      ],
    }).compile();
    service = module.get(InstitutionService);
    delete process.env.INSTITUTION_NAME;
    delete process.env.INSTITUTION_SHORT_NAME;
  });

  it('la primera vez nace del entorno, así cada despliegue arranca con su nombre', async () => {
    repo.findOne.mockResolvedValue(null);
    process.env.INSTITUTION_NAME = '  Bomberos Voluntarios  ';
    process.env.INSTITUTION_SHORT_NAME = 'BV';
    await service.find();
    expect(repo.create).toHaveBeenCalledWith({ name: 'Bomberos Voluntarios', shortName: 'BV' });
  });

  it('sin nombre en el entorno usa el del producto', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.find();
    expect(repo.create).toHaveBeenCalledWith({ name: DEFAULT_INSTITUTION_NAME, shortName: null });
  });

  it('publica nombre, sigla y la ruta del logo; sin logo va null', async () => {
    expect(await service.findPublic()).toEqual({
      name: 'Fundación Rescate Urbano', shortName: 'FRU', logoUrl: null,
    });
    repo.findOne.mockResolvedValue(saved({ logoFileName: 'logo_abc.png' }));
    expect((await service.findPublic()).logoUrl).toBe('/api/institution/logo/logo_abc.png');
  });

  it('al cambiar el nombre recorta espacios y una sigla vacía la borra', async () => {
    const result = await service.update({ name: '  Rescate Urbano ', shortName: '  ' });
    expect(result).toEqual(expect.objectContaining({ name: 'Rescate Urbano', shortName: null }));
  });

  it('un logo nuevo reemplaza al anterior y lo borra del almacenamiento', async () => {
    repo.findOne.mockResolvedValue(saved({ logoFileName: 'logo_viejo.png' }));
    const file = { originalname: 'marca.png', mimetype: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) } as any;
    const result = await service.setLogo(file);
    expect(storage.put).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/branding\/logo_.*\.png$/), file.buffer);
    expect(result.logoFileName).toMatch(/^logo_.*\.png$/);
    expect(storage.delete).toHaveBeenCalledWith('uploads/branding/logo_viejo.png');
  });

  it('rechaza un archivo que no es una imagen de verdad', async () => {
    const file = { originalname: 'virus.png', mimetype: 'image/png', buffer: Buffer.from('no soy una imagen') } as any;
    await expect(service.setLogo(file)).rejects.toThrow('El logo debe ser una imagen');
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('solo sirve el logo vigente: otro nombre no abre ningún archivo', async () => {
    repo.findOne.mockResolvedValue(saved({ logoFileName: 'logo_abc.png' }));
    await expect(service.getLogo('logo_otro.png')).rejects.toThrow(NotFoundException);
    expect(storage.get).not.toHaveBeenCalled();
    await service.getLogo('logo_abc.png');
    expect(storage.get).toHaveBeenCalledWith('uploads/branding/logo_abc.png');
  });
});
