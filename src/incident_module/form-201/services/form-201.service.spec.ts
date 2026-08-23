import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { Form201Service } from './form-201.service';
import { Form201Entity } from '../entities/form-201.entity';
import { AttendEntity } from '../../../organization_module/attends/entities/attends.entity';
import { ActionEntity } from '../../action/entities/action.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { EmergencyStatus } from '../../../organization_module/emergency/enums/emergency-status.enum';

describe('Form201Service', () => {
  let service: Form201Service;
  let form201Repo: jest.Mocked<Repository<Form201Entity>>;
  let attendRepo: jest.Mocked<Repository<AttendEntity>>;
  let actionRepo: jest.Mocked<Repository<ActionEntity>>;
  let emergencyService: jest.Mocked<EmergencyService>;
  let userService: jest.Mocked<UserService>;

  const mockEmergency = {
    id: 'emergency-1',
    code: 'EMG-001',
    name: 'Incendio Forestal',
    state: EmergencyStatus.Active,
  };

  const mockUser = {
    id: 'user-1',
    name: 'Juan',
    lastName: 'Pérez',
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn(),
      update: jest.fn(),
    });

    const mockEmergencyService = {
      findOne: jest.fn().mockResolvedValue(mockEmergency),
      assertEditable: jest.fn(),
    };

    const mockUserService = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Form201Service,
        { provide: getRepositoryToken(Form201Entity), useFactory: mockRepo },
        { provide: getRepositoryToken(AttendEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(ActionEntity), useFactory: mockRepo },
        { provide: EmergencyService, useValue: mockEmergencyService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<Form201Service>(Form201Service);
    form201Repo = module.get(getRepositoryToken(Form201Entity));
    attendRepo = module.get(getRepositoryToken(AttendEntity));
    actionRepo = module.get(getRepositoryToken(ActionEntity));
    emergencyService = module.get(EmergencyService);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      date: new Date('2026-08-08'),
      nature: 'Incendio',
      thread: 'Fuego descontrolado',
      affectedArea: 'Sector Norte',
      communicationsChannel: 'VHF Ch 1',
      entryRoute: 'Ruta 5',
      egressRoute: 'Ruta 5',
      objectives: 'Controlar el fuego',
      strategies: 'Ataque directo',
      tactics: 'Líneas de agua',
      safetyMessage: 'Mantener distancia',
    };

    it('should successfully create Form201', async () => {
      form201Repo.findOne.mockResolvedValue(null);
      form201Repo.count.mockResolvedValue(0);
      attendRepo.find.mockResolvedValue([]);
      form201Repo.save.mockResolvedValue({ id: 'form-1', code: 'F201-001', ...createDto } as any);

      const result = await service.create('emergency-1', createDto as any, 'user-1');

      expect(result).toHaveProperty('id', 'form-1');
      expect(result.code).toBe('F201-001');
      expect(emergencyService.findOne).toHaveBeenCalledWith('emergency-1');
      expect(emergencyService.assertEditable).toHaveBeenCalledWith(mockEmergency);
      expect(form201Repo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if an active Form201 already exists', async () => {
      form201Repo.findOne.mockResolvedValue({ id: 'existing-form' } as any);

      await expect(
        service.create('emergency-1', createDto as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if save fails with database code 23505', async () => {
      form201Repo.findOne.mockResolvedValue(null);
      form201Repo.count.mockResolvedValue(0);
      attendRepo.find.mockResolvedValue([]);
      
      const dbError: any = new Error('Duplicate key violation');
      dbError.code = '23505';
      form201Repo.save.mockRejectedValue(dbError);

      await expect(
        service.create('emergency-1', createDto as any, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = {
      nature: 'Incendio Modificado',
      clientGeneratedId: 'some-uuid',
      code: 'F201-999',
      isFinalized: true,
    };

    const existingForm = {
      id: 'form-1',
      code: 'F201-001',
      nature: 'Incendio',
      isFinalized: false,
      emergency: mockEmergency,
    };

    it('should update Form201 but ignore immutable fields', async () => {
      form201Repo.findOne.mockResolvedValueOnce(existingForm as any);
      form201Repo.update.mockResolvedValue({ affected: 1 } as any);
      form201Repo.findOne.mockResolvedValueOnce({ ...existingForm, nature: 'Incendio Modificado' } as any);

      const result = await service.update('form-1', updateDto as any);

      expect(result.nature).toBe('Incendio Modificado');
      expect(form201Repo.update).toHaveBeenCalledWith('form-1', {
        nature: 'Incendio Modificado',
      });
    });

    it('should throw BadRequestException if form is already finalized', async () => {
      form201Repo.findOne.mockResolvedValueOnce({
        ...existingForm,
        isFinalized: true,
      } as any);

      await expect(service.update('form-1', updateDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalize', () => {
    const existingForm = {
      id: 'form-1',
      code: 'F201-001',
      isFinalized: false,
      emergency: mockEmergency,
    };

    it('should finalize Form201 and record an action in the log', async () => {
      form201Repo.findOne.mockResolvedValue(existingForm as any);
      form201Repo.save.mockResolvedValue({ ...existingForm, isFinalized: true } as any);
      actionRepo.create.mockImplementation((dto) => dto as any);
      actionRepo.save.mockResolvedValue({ id: 'action-1' } as any);

      const result = await service.finalize('form-1', 'user-1');

      expect(result.isFinalized).toBe(true);
      expect(actionRepo.save).toHaveBeenCalled();
    });
  });
});
