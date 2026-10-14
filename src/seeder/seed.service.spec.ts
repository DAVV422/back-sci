import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { SeedService } from './seed.service';
import { UserService } from '../user/services/user.service';
import { ChargeCatalogService } from '../sci_module/charges/services/charge-catalog.service';
import { ROLES } from '../common/constants';

describe('SeedService', () => {
  let service: SeedService;
  let mockChargeService: any;
  let mockUserService: any;
  let mockConfigService: any;

  const buildConfigService = (overrides: Record<string, string> = {}) => {
    const env: Record<string, string> = {
      ADMIN_EMAIL: 'admin@sci.local',
      ADMIN_PASSWORD: 'ChangeMe123!',
      ADMIN_NAME: 'Administrador',
      ADMIN_LAST_NAME: 'Sistema',
      ...overrides,
    };
    return {
      get: jest.fn().mockImplementation((key: string) => env[key]),
    };
  };

  beforeEach(async () => {
    mockChargeService = {
      sync: jest.fn().mockResolvedValue({ created: [], updated: [], merged: [], retired: [] }),
    };
    mockUserService = {
      countUsers: jest.fn().mockResolvedValue(0),
      findByEmail: jest.fn().mockRejectedValue(new Error('not found')),
      createUser: jest.fn().mockResolvedValue({ id: 'admin-1' }),
      update: jest.fn().mockResolvedValue({ id: 'admin-1' }),
    };
    mockConfigService = buildConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: UserService, useValue: mockUserService },
        { provide: ChargeCatalogService, useValue: mockChargeService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('runAllSeeders - admin desde variables de entorno (F1-020)', () => {
    it('crea el usuario admin cuando las variables de entorno están definidas', async () => {
      await service.runAllSeeders();

      expect(mockUserService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@sci.local',
          password: 'ChangeMe123!',
          name: 'Administrador',
          lastName: 'Sistema',
          role: ROLES.SUADMIN,
        }),
        // En una base vacía no hay ningún suadmin: el seeder crea el primero como el sistema.
        ROLES.SUADMIN,
      );
    });

    it('lanza error claro si faltan ADMIN_EMAIL y ADMIN_PASSWORD', async () => {
      mockConfigService.get.mockImplementation(() => undefined);

      await expect(service.runAllSeeders()).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.runAllSeeders()).rejects.toThrow(
        'Variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD son requeridas para el seeder',
      );
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('no duplica el admin si ya existe por email (idempotente)', async () => {
      mockUserService.findByEmail.mockResolvedValue({ id: 'admin-1' });

      await service.runAllSeeders();
      await service.runAllSeeders();

      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('no loguea ni expone la contraseña en el DTO creado', async () => {
      await service.runAllSeeders();

      const createCall = mockUserService.createUser.mock.calls[0][0];
      expect(createCall.password).toBe('ChangeMe123!');
    });

    it('carga los cargos SCI incluso si el admin ya existía', async () => {
      mockUserService.findByEmail.mockResolvedValue({ id: 'admin-1' });

      await service.runAllSeeders();

      expect(mockChargeService.sync).toHaveBeenCalled();
    });
  });

  describe('cargarChargeSCI', () => {
    it('delega en el catálogo del manual (ChargeCatalogService.sync)', async () => {
      await service.cargarChargeSCI();
      expect(mockChargeService.sync).toHaveBeenCalledTimes(1);
    });
  });
});
