import { Test, TestingModule } from '@nestjs/testing';

import { SeedService } from './seed.service';
import { UserService } from './../user/services/user.service';
import { ChargeService } from './../sci_module/charges/services/charge.service';

describe('SeedService', () => {
  let service: SeedService;
  let mockChargeService: any;

  beforeEach(async () => {
    mockChargeService = {
      countCharges: jest.fn().mockResolvedValue(0),
      findByName: jest.fn().mockRejectedValue(new Error('not found')),
      create: jest.fn().mockResolvedValue({ id: 'charge-1' }),
      update: jest.fn().mockResolvedValue({ id: 'charge-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: UserService, useValue: { countUsers: jest.fn() } },
        { provide: ChargeService, useValue: mockChargeService },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
