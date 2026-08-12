import { Test, TestingModule } from '@nestjs/testing';
import { Form201Controller } from './form-201.controller';
import { Form201Service } from '../services/form-201.service';
import { ParseUUIDPipe } from '@nestjs/common';
import { Form201Entity } from '../entities/form-201.entity';

describe('Form201Controller', () => {
  let controller: Form201Controller;
  let service: jest.Mocked<Form201Service>;

  const mockForm201 = {
    id: 'form-1',
    code: 'F201-001',
    nature: 'Incendio',
  } as Form201Entity;

  beforeEach(async () => {
    const mockForm201Service = {
      create: jest.fn().mockResolvedValue(mockForm201),
      findActiveByEmergency: jest.fn().mockResolvedValue(mockForm201),
      update: jest.fn().mockResolvedValue(mockForm201),
      finalize: jest.fn().mockResolvedValue(mockForm201),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [Form201Controller],
      providers: [
        { provide: Form201Service, useValue: mockForm201Service },
      ],
    }).compile();

    controller = module.get<Form201Controller>(Form201Controller);
    service = module.get(Form201Service);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return standard response', async () => {
      const dto = { nature: 'Incendio' } as any;
      const res = await controller.create('emergency-1', dto, 'user-1');

      expect(service.create).toHaveBeenCalledWith('emergency-1', dto, 'user-1');
      expect(res).toEqual({
        success: true,
        statusCode: 201,
        message: 'Formulario 201 creado exitosamente.',
        data: mockForm201,
      });
    });
  });

  describe('findActiveByEmergency', () => {
    it('should call service.findActiveByEmergency and return standard response', async () => {
      const res = await controller.findActiveByEmergency('emergency-1');

      expect(service.findActiveByEmergency).toHaveBeenCalledWith('emergency-1');
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        data: mockForm201,
      });
    });
  });

  describe('update', () => {
    it('should call service.update and return standard response', async () => {
      const dto = { nature: 'Incendio Modificado' } as any;
      const res = await controller.update('form-1', dto);

      expect(service.update).toHaveBeenCalledWith('form-1', dto);
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        message: 'Formulario 201 actualizado exitosamente.',
        data: mockForm201,
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
        message: 'Formulario 201 finalizado exitosamente.',
        data: mockForm201,
      });
    });
  });

  describe('delete', () => {
    it('should call service.delete and return standard response', async () => {
      const res = await controller.delete('form-1');

      expect(service.delete).toHaveBeenCalledWith('form-1');
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        message: 'Formulario 201 eliminado exitosamente.',
        data: null,
      });
    });
  });
});
