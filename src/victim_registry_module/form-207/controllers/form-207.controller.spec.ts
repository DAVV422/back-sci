import { Test, TestingModule } from '@nestjs/testing';
import { Form207Controller } from './form-207.controller';
import { Form207Service } from '../services/form-207.service';
import { Form207Entity } from '../entities/form-207.entity';
import { AuthGuard, RolesGuard } from '../../../auth/guards';

describe('Form207Controller', () => {
  let controller: Form207Controller;
  let service: jest.Mocked<Form207Service>;

  const mockForm207 = {
    id: 'form-1',
    code: 'F207-001',
    placeOfRegistration: 'Zona A',
    attendant: 'Juan',
  } as Form207Entity;

  beforeEach(async () => {
    const mockForm207Service = {
      create: jest.fn().mockResolvedValue(mockForm207),
      findByEmergency: jest.fn().mockResolvedValue([mockForm207]),
      finalize: jest.fn().mockResolvedValue(mockForm207),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [Form207Controller],
      providers: [
        { provide: Form207Service, useValue: mockForm207Service },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<Form207Controller>(Form207Controller);
    service = module.get(Form207Service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return standard response', async () => {
      const dto = { placeOfRegistration: 'Zona A', attendant: 'Juan' } as any;
      const res = await controller.create('emergency-1', dto, 'user-1');

      expect(service.create).toHaveBeenCalledWith('emergency-1', dto, 'user-1');
      expect(res).toEqual({
        success: true,
        statusCode: 201,
        message: 'Formulario 207 creado exitosamente.',
        data: mockForm207,
      });
    });
  });

  describe('findByEmergency', () => {
    it('should call service.findByEmergency and return standard response', async () => {
      const res = await controller.findByEmergency('emergency-1');

      expect(service.findByEmergency).toHaveBeenCalledWith('emergency-1');
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        data: [mockForm207],
      });
    });
  });

  describe('finalize', () => {
    it('should call service.finalize and return standard response', async () => {
      const res = await controller.finalize('form-1', 'user-1');

      expect(service.finalize).toHaveBeenCalledWith('form-1', 'user-1');
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        message: 'Formulario 207 finalizado exitosamente.',
        data: mockForm207,
      });
    });
  });
});
