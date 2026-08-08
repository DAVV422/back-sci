import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { SeedService } from './seed.service';
import { UserService } from './../user/services/user.service';
import { ChargeService } from './../sci_module/charges/services/charge.service';
import { ROLES } from './../common/constants';

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
      countCharges: jest.fn().mockResolvedValue(0),
      findByName: jest.fn().mockRejectedValue(new Error('not found')),
      create: jest.fn().mockResolvedValue({ id: 'charge-1' }),
      update: jest.fn().mockResolvedValue({ id: 'charge-1' }),
    };
    mockUserService = {
      countUsers: jest.fn().mockResolvedValue(0),
      findByEmail: jest.fn().mockRejectedValue(new Error('not found')),
      createUser: jest.fn().mockResolvedValue({ id: 'admin-1' }),
    };
    mockConfigService = buildConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: UserService, useValue: mockUserService },
        { provide: ChargeService, useValue: mockChargeService },
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
          last_name: 'Sistema',
          role: ROLES.ADMIN,
        }),
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

      expect(mockChargeService.create).toHaveBeenCalled();
    });
  });

  describe('cargarChargeSCI - system_name (F1-013)', () => {
    it('asigna system_name = incident_commander al cargo CI', async () => {
      await service.cargarChargeSCI();

      const createCalls = mockChargeService.create.mock.calls.map(
        (call: any[]) => call[0],
      );
      const ci = createCalls.find(
        (c: any) => c.name === 'Comandante del Incidente',
      );
      expect(ci).toBeDefined();
      expect(ci.system_name).toBe('incident_commander');
    });

    it('asigna system_name a los jefes de sección', async () => {
      await service.cargarChargeSCI();

      const createCalls = mockChargeService.create.mock.calls.map(
        (call: any[]) => call[0],
      );
      const systemNames = createCalls
        .map((c: any) => c.system_name)
        .filter((s: any) => s);
      expect(systemNames).toEqual(
        expect.arrayContaining([
          'incident_commander',
          'operations_chief',
          'planning_chief',
          'logistics_chief',
          'admin_finance_chief',
        ]),
      );
    });

    it('los system_name no-null son únicos entre los cargos', async () => {
      await service.cargarChargeSCI();

      const createCalls = mockChargeService.create.mock.calls.map(
        (call: any[]) => call[0],
      );
      const systemNames = createCalls
        .map((c: any) => c.system_name)
        .filter((s: any) => s);
      const unique = new Set(systemNames);
      expect(unique.size).toBe(systemNames.length);
    });

    it('actualiza cargos existentes con system_name (upsert)', async () => {
      mockChargeService.findByName.mockImplementation(async (name: string) => {
        if (name === 'Comandante del Incidente') return { id: 'ci-1' };
        throw new Error('not found');
      });

      await service.cargarChargeSCI();

      expect(mockChargeService.update).toHaveBeenCalledWith('ci-1', {
        system_name: 'incident_commander',
      });
    });
  });
});
