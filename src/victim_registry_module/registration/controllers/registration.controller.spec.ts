import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from '../services/registration.service';
import { RegistrationEntity } from '../entities/registration.entity';

describe('RegistrationController', () => {
  let controller: RegistrationController;
  let service: jest.Mocked<RegistrationService>;

  const mockRegistration = {
    id: 'reg-1',
    classification: 'rojo',
  } as RegistrationEntity;

  beforeEach(async () => {
    const mockRegistrationService = {
      create: jest.fn().mockResolvedValue(mockRegistration),
      findByForm207: jest.fn().mockResolvedValue([mockRegistration]),
      findHistoryByVictim: jest.fn().mockResolvedValue([mockRegistration]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [
        { provide: RegistrationService, useValue: mockRegistrationService },
      ],
    }).compile();

    controller = module.get<RegistrationController>(RegistrationController);
    service = module.get(RegistrationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return standard response', async () => {
      const dto = { victimId: 'victim-1', classification: 'rojo' } as any;
      const res = await controller.create('form207-1', dto, 'user-1');

      expect(service.create).toHaveBeenCalledWith('form207-1', dto, 'user-1');
      expect(res).toEqual({
        success: true,
        statusCode: 201,
        message: 'Triage de víctima registrado exitosamente.',
        data: mockRegistration,
      });
    });
  });

  describe('findByForm207', () => {
    it('should call service.findByForm207 and return standard response', async () => {
      const res = await controller.findByForm207('form207-1');

      expect(service.findByForm207).toHaveBeenCalledWith('form207-1');
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        data: [mockRegistration],
      });
    });
  });

  describe('findHistoryByVictim', () => {
    it('should call service.findHistoryByVictim and return standard response', async () => {
      const res = await controller.findHistoryByVictim('victim-1');

      expect(service.findHistoryByVictim).toHaveBeenCalledWith('victim-1');
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        data: [mockRegistration],
      });
    });
  });
});
