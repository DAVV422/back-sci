import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { RegistrationService } from './registration.service';
import { RegistrationEntity } from '../entities/registration.entity';
import { Form207Service } from '../../form-207/services/form-207.service';
import { VictimService } from '../../victim/services/victim.service';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import {
  EmergencyAccessService,
  TRIAGE_REGISTRAR_CHARGES,
} from '../../../organization_module/emergency/services/emergency-access.service';
import { UserService } from '../../../user/services/user.service';
import { HealthFacilityService } from '../../health-facility/services/health-facility.service';

describe('RegistrationService', () => {
  const mockHealthFacilityService = {
    findOrCreate: jest.fn(async (name: string) => ({ id: 'hf-1', name })),
  };
  let service: RegistrationService;
  let repo: jest.Mocked<Repository<RegistrationEntity>>;
  let form207Service: jest.Mocked<Form207Service>;
  let victimService: jest.Mocked<VictimService>;
  let emergencyService: jest.Mocked<EmergencyService>;
  let userService: jest.Mocked<UserService>;

  const mockForm207 = {
    id: 'form207-1',
    code: 'F207-001',
    isFinalized: false,
    emergency: { id: 'emergency-1' },
  };

  const mockVictim = {
    id: 'victim-1',
    identifier: 'NN-001',
  };

  const mockUser = {
    id: 'user-1',
    name: 'Officer',
  };

  const mockEmergencyAccessService = {
    assertMember: jest.fn().mockResolvedValue(undefined),
    assertHasCharge: jest.fn().mockResolvedValue(undefined),
    assertCommanderOrManager: jest.fn().mockResolvedValue(undefined),
    assertCanViewPatients: jest.fn().mockResolvedValue(undefined),
    isManagerOrAbove: jest.fn((role: string) => ['manager', 'admin', 'suadmin'].includes(role)),
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn(),
      find: jest.fn(),
      query: jest.fn(),
    });

    const mockForm207Service = {
      findOne: jest.fn().mockResolvedValue(mockForm207),
    };

    const mockVictimService = {
      findOne: jest.fn().mockResolvedValue(mockVictim),
    };

    const mockEmergencyService = {
      assertEditable: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ id: 'emergency-1' }),
    };

    const mockUserService = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: getRepositoryToken(RegistrationEntity), useFactory: mockRepo },
        { provide: Form207Service, useValue: mockForm207Service },
        { provide: VictimService, useValue: mockVictimService },
        { provide: EmergencyService, useValue: mockEmergencyService },
        {
          provide: EmergencyAccessService,
          useValue: mockEmergencyAccessService,
        },
        { provide: UserService, useValue: mockUserService },
        { provide: HealthFacilityService, useValue: mockHealthFacilityService },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    repo = module.get(getRepositoryToken(RegistrationEntity));
    form207Service = module.get(Form207Service);
    victimService = module.get(VictimService);
    emergencyService = module.get(EmergencyService);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      victimId: 'victim-1',
      classification: 'rojo',
      notes: 'Crítico',
    } as any;

    it('should successfully create triage registration', async () => {
      repo.save.mockResolvedValue({ id: 'reg-1', ...dto } as any);

      const result = await service.create('form207-1', dto, 'user-1');

      expect(result).toHaveProperty('id', 'reg-1');
      expect(form207Service.findOne).toHaveBeenCalledWith('form207-1');
      expect(emergencyService.assertEditable).toHaveBeenCalled();
      expect(victimService.findOne).toHaveBeenCalledWith('victim-1');
      expect(repo.save).toHaveBeenCalled();
    });

    it('con lugar y medio de traslado, reutiliza o crea el centro de salud', async () => {
      repo.save.mockImplementation(async (r: any) => ({ id: 'reg-1', ...r }));

      await service.create(
        'form207-1',
        { ...dto, transferDestination: ' Hospital de Clínicas ', transportMeans: 'ambulancia' },
        'user-1',
      );

      expect(mockHealthFacilityService.findOrCreate).toHaveBeenCalledWith('Hospital de Clínicas');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transportMeans: 'ambulancia',
          transferDestination: { id: 'hf-1', name: 'Hospital de Clínicas' },
        }),
      );
    });

    it.each([
      [{ transferDestination: 'Hospital de Clínicas' }],
      [{ transportMeans: 'aereo' }],
      [{ transferDestination: '   ', transportMeans: 'aereo' }],
    ])('rechaza lugar sin medio o medio sin lugar (%o)', async (transfer) => {
      await expect(service.create('form207-1', { ...dto, ...transfer }, 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Form207 is already finalized', async () => {
      form207Service.findOne.mockResolvedValueOnce({
        ...mockForm207,
        isFinalized: true,
      } as any);

      await expect(service.create('form207-1', dto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('solo registran pacientes el EACV, el LUMED, el CI o manager+ (decisión 26)', async () => {
      mockEmergencyAccessService.assertHasCharge.mockRejectedValueOnce(
        new ForbiddenException('sin permiso'),
      );

      await expect(
        service.create('form207-1', dto, 'user-1', 'basic'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockEmergencyAccessService.assertHasCharge).toHaveBeenCalledWith(
        mockForm207.emergency.id,
        'user-1',
        'basic',
        TRIAGE_REGISTRAR_CHARGES,
        expect.any(String),
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('getTriageSummaryByEmergency', () => {
    it('suma las víctimas por su clasificación más reciente', async () => {
      repo.query.mockResolvedValue([
        { classification: 'rojo', count: '2' },
        { classification: 'verde', count: '5' },
      ]);

      const summary = await service.getTriageSummaryByEmergency('emergency-1');

      expect(summary).toEqual({ total: 7, rojo: 2, amarillo: 0, verde: 5, negro: 0 });
      expect(repo.query).toHaveBeenCalledWith(
        expect.stringContaining('DISTINCT ON (r.victim_id)'),
        ['emergency-1'],
      );
    });
  });

  describe('findHistoryByVictim', () => {
    it('should query registrations ordered by createdAt DESC', async () => {
      repo.find.mockResolvedValue([]);

      await service.findHistoryByVictim('victim-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { victim: { id: 'victim-1' } },
        relations: ['form207', 'form207.emergency', 'user', 'transferDestination'],
        order: { createdAt: 'DESC' },
      });
    });

    it('con rol informado exige acceso a cada emergencia del historial', async () => {
      repo.find.mockResolvedValue([
        { id: 'r1', form207: { emergency: { id: 'em-1' } } },
        { id: 'r2', form207: { emergency: { id: 'em-1' } } },
        { id: 'r3', form207: { emergency: { id: 'em-2' } } },
      ] as any);

      await service.findHistoryByVictim('victim-1', 'user-1', 'basic');

      expect(mockEmergencyAccessService.assertCanViewPatients.mock.calls.slice(-2)).toEqual([
        ['em-1', 'user-1', 'basic'],
        ['em-2', 'user-1', 'basic'],
      ]);
    });
  });

  describe('findByForm207 - privacidad', () => {
    it('con rol informado exige poder ver pacientes de la emergencia', async () => {
      repo.find.mockResolvedValue([]);
      await service.findByForm207('form207-1', 'user-1', 'basic');
      expect(mockEmergencyAccessService.assertCanViewPatients).toHaveBeenCalledWith(
        mockForm207.emergency.id,
        'user-1',
        'basic',
      );
    });
  });
});
