import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { RegistrationService } from './registration.service';
import { RegistrationEntity } from '../entities/registration.entity';
import { Form207Service } from '../../form-207/services/form-207.service';
import { VictimService } from '../../victim/services/victim.service';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';

describe('RegistrationService', () => {
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

  beforeEach(async () => {
    const mockRepo = () => ({
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn(),
      find: jest.fn(),
    });

    const mockForm207Service = {
      findOne: jest.fn().mockResolvedValue(mockForm207),
    };

    const mockVictimService = {
      findOne: jest.fn().mockResolvedValue(mockVictim),
    };

    const mockEmergencyService = {
      assertEditable: jest.fn(),
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
        { provide: UserService, useValue: mockUserService },
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

    it('should throw BadRequestException if Form207 is already finalized', async () => {
      form207Service.findOne.mockResolvedValueOnce({
        ...mockForm207,
        isFinalized: true,
      } as any);

      await expect(service.create('form207-1', dto, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findHistoryByVictim', () => {
    it('should query registrations ordered by createdAt DESC', async () => {
      repo.find.mockResolvedValue([]);

      await service.findHistoryByVictim('victim-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { victim: { id: 'victim-1' } },
        relations: ['form207', 'user'],
        order: { createdAt: 'DESC' },
      });
    });
  });
});
