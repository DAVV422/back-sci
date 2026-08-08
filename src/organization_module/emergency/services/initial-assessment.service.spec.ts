import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';

import { InitialAssessmentService } from './initial-assessment.service';
import { InitialAssessmentEntity } from '../entities/initial-assessment.entity';
import { CreateInitialAssessmentDto } from '../dto/create-initial-assessment.dto';
import { EmergencyEntity } from '../entities/emergency.entity';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { SeverityLevel } from '../enums/severity-level.enum';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { UserService } from '../../../user/services/user.service';

describe('InitialAssessmentService', () => {
  let service: InitialAssessmentService;
  let mockAssessmentRepo: any;
  let mockEmergencyRepo: any;
  let mockActionRepo: any;
  let mockUserService: any;

  const emergencyId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
  const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';

  const dto = {
    hazard_type: 'Derrame de combustible',
    severity_level: SeverityLevel.Alto,
    affected_people_estimated: 25,
    situation_description: 'Dos vehículos involucrados',
    weather_conditions: 'Viento moderado',
  };

  const emergencyBase = {
    id: emergencyId,
    state: EmergencyStatus.Pending,
    initialAssessment: null,
  };

  beforeEach(async () => {
    mockAssessmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };
    mockEmergencyRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    mockActionRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    mockUserService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InitialAssessmentService,
        {
          provide: getRepositoryToken(InitialAssessmentEntity),
          useValue: mockAssessmentRepo,
        },
        {
          provide: getRepositoryToken(EmergencyEntity),
          useValue: mockEmergencyRepo,
        },
        {
          provide: getRepositoryToken(ActionEntity),
          useValue: mockActionRepo,
        },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<InitialAssessmentService>(InitialAssessmentService);
  });

  describe('create', () => {
    beforeEach(() => {
      mockEmergencyRepo.findOne.mockResolvedValue({ ...emergencyBase });
      mockUserService.findOne.mockResolvedValue({ id: userId });
      mockAssessmentRepo.create.mockImplementation((data: any) => ({
        ...data,
      }));
      mockAssessmentRepo.save.mockImplementation(async (data: any) => ({
        id: 'assessment-1',
        ...data,
      }));
      mockActionRepo.create.mockImplementation((data: any) => ({ ...data }));
      mockActionRepo.save.mockImplementation(async (data: any) => ({
        id: 'action-1',
        ...data,
      }));
      mockEmergencyRepo.save.mockImplementation(async (data: any) => data);
    });

    it('persiste la evaluación y registra la acción automática', async () => {
      const result = await service.create(emergencyId, dto as any, userId);

      expect(mockAssessmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          severity_level: SeverityLevel.Alto,
          situation_description: 'Dos vehículos involucrados',
        }),
      );
      expect(mockEmergencyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: emergencyId,
          initialAssessment: expect.objectContaining({ id: 'assessment-1' }),
        }),
      );
      expect(mockActionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Evaluación Inicial registrada',
        }),
      );
      expect(result).toHaveProperty('id', 'assessment-1');
    });

    it('lanza BadRequestException si ya existe una evaluación para la emergencia', async () => {
      mockEmergencyRepo.findOne.mockResolvedValue({
        ...emergencyBase,
        initialAssessment: { id: 'assessment-1' },
      });

      await expect(
        service.create(emergencyId, dto as any, userId),
      ).rejects.toThrow(BadRequestException);
      expect(mockAssessmentRepo.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la emergencia está cancelada', async () => {
      mockEmergencyRepo.findOne.mockResolvedValue({
        ...emergencyBase,
        state: EmergencyStatus.Canceled,
      });

      await expect(
        service.create(emergencyId, dto as any, userId),
      ).rejects.toThrow(BadRequestException);
      expect(mockAssessmentRepo.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la emergencia está finalizada', async () => {
      mockEmergencyRepo.findOne.mockResolvedValue({
        ...emergencyBase,
        state: EmergencyStatus.Finished,
      });

      await expect(
        service.create(emergencyId, dto as any, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si la emergencia no existe', async () => {
      mockEmergencyRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(emergencyId, dto as any, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockAssessmentRepo.findOne.mockResolvedValue({
        id: 'assessment-1',
        hazard_type: 'Derrame de combustible',
      });
    });

    it('actualiza la evaluación existente', async () => {
      mockEmergencyRepo.findOne.mockResolvedValue({
        ...emergencyBase,
        initialAssessment: { id: 'assessment-1' },
      });

      const result = await service.update(emergencyId, {
        weather_conditions: 'Sin viento',
      } as any);

      expect(mockAssessmentRepo.update).toHaveBeenCalledWith('assessment-1', {
        weather_conditions: 'Sin viento',
      });
      expect(mockAssessmentRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'assessment-1' },
      });
      expect(result).toHaveProperty('id', 'assessment-1');
    });

    it('lanza NotFoundException si no existe evaluación para la emergencia', async () => {
      mockEmergencyRepo.findOne.mockResolvedValue({ ...emergencyBase });

      await expect(
        service.update(emergencyId, {
          weather_conditions: 'Sin viento',
        } as any),
      ).rejects.toThrow(NotFoundException);
      expect(mockAssessmentRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('CreateInitialAssessmentDto', () => {
    it('valida que severity_level esté en Bajo, Medio, Alto, Extremo', async () => {
      const dtoInstance = Object.assign(new CreateInitialAssessmentDto(), {
        hazard_type: 'Derrame',
        severity_level: 'Crítico',
        situation_description: 'Descripción',
      });

      const errors = await validate(dtoInstance);

      expect(errors.some((e) => e.property === 'severity_level')).toBe(true);
    });

    it('acepta severity_level válido', async () => {
      const dtoInstance = Object.assign(new CreateInitialAssessmentDto(), {
        hazard_type: 'Derrame',
        severity_level: SeverityLevel.Medio,
        situation_description: 'Descripción',
      });

      const errors = await validate(dtoInstance);

      expect(errors.some((e) => e.property === 'severity_level')).toBe(false);
    });
  });
});
