import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { Form207Service } from './form-207.service';
import { Form207Entity } from '../entities/form-207.entity';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { EmergencyService } from '../../../organization_module/emergency/services/emergency.service';
import { UserService } from '../../../user/services/user.service';
import { EmergencyStatus } from '../../../organization_module/emergency/enums/emergency-status.enum';

describe('Form207Service', () => {
  let service: Form207Service;
  let form207Repo: jest.Mocked<Repository<Form207Entity>>;
  let actionRepo: jest.Mocked<Repository<ActionEntity>>;
  let emergencyService: jest.Mocked<EmergencyService>;
  let userService: jest.Mocked<UserService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockEmergency = {
    id: 'emergency-1',
    code: 'EMG-001',
    name: 'Accidente Químico',
    state: EmergencyStatus.Active,
  };

  const mockUser = {
    id: 'user-1',
    name: 'Jane',
    lastName: 'Doe',
  };

  const queryRunnerMock = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([{ last_value: 1 }]),
    manager: {
      query: jest.fn().mockResolvedValue([{ last_value: 1 }]),
      findOne: jest.fn().mockImplementation((entityClass, options) => {
        if (entityClass.name === 'EmergencyEntity') {
          return mockEmergency;
        }
        if (entityClass.name === 'UserEntity') {
          return mockUser;
        }
        return null;
      }),
      create: jest.fn().mockImplementation((entityClass, dto) => dto),
      save: jest.fn().mockImplementation((entityClass, data) => ({ id: 'form-1', ...data })),
    },
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    });

    const mockEmergencyService = {
      findOne: jest.fn().mockResolvedValue(mockEmergency),
      assertEditable: jest.fn(),
    };

    const mockUserService = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };

    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunnerMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Form207Service,
        { provide: getRepositoryToken(Form207Entity), useFactory: mockRepo },
        { provide: getRepositoryToken(ActionEntity), useFactory: mockRepo },
        { provide: EmergencyService, useValue: mockEmergencyService },
        { provide: UserService, useValue: mockUserService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<Form207Service>(Form207Service);
    form207Repo = module.get(getRepositoryToken(Form207Entity));
    actionRepo = module.get(getRepositoryToken(ActionEntity));
    emergencyService = module.get(EmergencyService);
    userService = module.get(UserService);
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      placeOfRegistration: 'Zona Norte',
      attendant: 'Juan Pérez',
      date: new Date('2026-08-08'),
    };

    it('should successfully create Form207 using atomic counter transaction', async () => {
      const result = await service.create('emergency-1', createDto as any, 'user-1');

      expect(result).toHaveProperty('id', 'form-1');
      expect(result.code).toBe('F207-001');
      expect(queryRunnerMock.connect).toHaveBeenCalled();
      expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('emergency_form207_counter'),
        ['emergency-1'],
      );
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      queryRunnerMock.manager.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        service.create('emergency-1', createDto as any, 'user-1'),
      ).rejects.toThrow('DB Error');

      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalled();
    });
  });

  describe('finalize', () => {
    const existingForm = {
      id: 'form-1',
      code: 'F207-001',
      isFinalized: false,
      emergency: mockEmergency,
    };

    it('should finalize Form207 and save an action log', async () => {
      form207Repo.findOne.mockResolvedValue(existingForm as any);
      form207Repo.save.mockResolvedValue({ ...existingForm, isFinalized: true } as any);
      actionRepo.create.mockImplementation((dto) => dto as any);
      actionRepo.save.mockResolvedValue({ id: 'action-1' } as any);

      const result = await service.finalize('form-1', 'user-1');

      expect(result.isFinalized).toBe(true);
      expect(actionRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if form is already finalized', async () => {
      form207Repo.findOne.mockResolvedValue({ ...existingForm, isFinalized: true } as any);

      await expect(service.finalize('form-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
