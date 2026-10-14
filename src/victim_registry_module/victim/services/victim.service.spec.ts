import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { VictimService } from './victim.service';
import { VictimEntity } from '../entities/victim.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { EmergencyAccessService } from '../../../organization_module/emergency/services/emergency-access.service';

describe('VictimService', () => {
  const mockEmergencyAccessService = {
    assertMember: jest.fn().mockResolvedValue(undefined),
    assertHasCharge: jest.fn().mockResolvedValue(undefined),
    assertCommanderOrManager: jest.fn().mockResolvedValue(undefined),
    assertCanViewPatients: jest.fn().mockResolvedValue(undefined),
    isManagerOrAbove: jest.fn((role: string) => ['manager', 'admin', 'suadmin'].includes(role)),
  };
  const mockEmergencyService = { assertEditable: jest.fn() };
  let service: VictimService;
  let repo: jest.Mocked<Repository<VictimEntity>>;

  const mockVictim = {
    id: 'victim-1',
    identifier: 'NN-001',
    ageEstimated: 35,
    gender: 'Femenino',
    isDeleted: false,
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      merge: jest.fn((target: any, source: any) => Object.assign(target, source)),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VictimService,
        { provide: getRepositoryToken(VictimEntity), useFactory: mockRepo },
        { provide: EmergencyService, useValue: mockEmergencyService },
        { provide: EmergencyAccessService, useValue: mockEmergencyAccessService },
      ],
    }).compile();

    service = module.get<VictimService>(VictimService);
    repo = module.get(getRepositoryToken(VictimEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a victim', async () => {
      const dto = { identifier: 'NN-001' } as any;
      repo.save.mockResolvedValue({ id: 'victim-1', ...dto });

      const result = await service.create(dto);
      expect(result).toHaveProperty('id', 'victim-1');
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return the victim if active', async () => {
      repo.findOne.mockResolvedValue(mockVictim as any);

      const result = await service.findOne('victim-1');
      expect(result).toEqual(mockVictim);
    });

    it('should throw NotFoundException if victim not found or deleted', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('victim-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should perform a soft-delete', async () => {
      repo.findOne.mockResolvedValue(mockVictim as any);
      repo.update.mockResolvedValue({ affected: 1 } as any);

      await service.remove('victim-1');
      expect(repo.update).toHaveBeenCalledWith('victim-1', { isDeleted: true });
    });
  });

  describe('privacidad y permisos de pacientes (P0)', () => {
    const withRegistrations = (registrations: any[]) =>
      repo.findOne.mockImplementation(async (opts: any) =>
        opts?.relations ? ({ ...mockVictim, registrations } as any) : (mockVictim as any),
      );
    const openEmergency = { id: 'em-1', state: 'a' };

    it('findOneForUser: un rol distinto de basic no consulta participación', async () => {
      repo.findOne.mockResolvedValue(mockVictim as any);
      await service.findOneForUser('victim-1', 'user-1', 'advanced');
      expect(mockEmergencyAccessService.assertCanViewPatients).not.toHaveBeenCalledWith(
        expect.anything(), 'user-1', 'advanced',
      );
    });

    it('findOneForUser: basic se valida contra la emergencia del último registro', async () => {
      withRegistrations([
        { createdAt: '2026-10-01T10:00:00Z', form207: { emergency: { id: 'em-old' } } },
        { createdAt: '2026-10-03T10:00:00Z', form207: { emergency: openEmergency } },
      ]);
      await service.findOneForUser('victim-1', 'user-1', 'basic');
      expect(mockEmergencyAccessService.assertCanViewPatients).toHaveBeenCalledWith('em-1', 'user-1', 'basic');
    });

    it('findOneForUser: basic no ve una víctima sin registros', async () => {
      withRegistrations([]);
      await expect(service.findOneForUser('victim-1', 'user-1', 'basic')).rejects.toThrow(ForbiddenException);
    });

    it('update: exige ser EACV, LUMED, CI o manager+ en la emergencia y que esté abierta', async () => {
      withRegistrations([{ createdAt: '2026-10-03T10:00:00Z', form207: { emergency: openEmergency } }]);
      repo.save.mockResolvedValue(mockVictim as any);

      await service.update('victim-1', { ageEstimated: 30 } as any, 'user-1', 'basic');

      expect(mockEmergencyService.assertEditable).toHaveBeenCalledWith(openEmergency);
      expect(mockEmergencyAccessService.assertHasCharge).toHaveBeenCalledWith(
        'em-1', 'user-1', 'basic',
        ['incident_commander', 'medical_unit_leader', 'casualty_area_manager'],
        expect.any(String),
      );
    });

    it('update: sin registros solo un manager+ puede corregir', async () => {
      withRegistrations([]);
      repo.save.mockResolvedValue(mockVictim as any);
      await expect(service.update('victim-1', {} as any, 'user-1', 'basic')).rejects.toThrow(ForbiddenException);
      await expect(service.update('victim-1', {} as any, 'user-1', 'manager')).resolves.toBeDefined();
    });
  });
});

