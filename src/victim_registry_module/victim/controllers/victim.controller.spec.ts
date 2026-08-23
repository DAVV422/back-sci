import { Test, TestingModule } from '@nestjs/testing';
import { VictimController } from './victim.controller';
import { VictimService } from '../services/victim.service';
import { VictimEntity } from '../entities/victim.entity';
import { AuthGuard, RolesGuard } from '../../../auth/guards';

describe('VictimController', () => {
  let controller: VictimController;
  let service: jest.Mocked<VictimService>;

  const mockVictim = {
    id: 'victim-1',
    identifier: 'NN-001',
    ageEstimated: 25,
  } as VictimEntity;

  beforeEach(async () => {
    const mockVictimService = {
      create: jest.fn().mockResolvedValue(mockVictim),
      findOne: jest.fn().mockResolvedValue(mockVictim),
      update: jest.fn().mockResolvedValue(mockVictim),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VictimController],
      providers: [
        { provide: VictimService, useValue: mockVictimService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VictimController>(VictimController);
    service = module.get(VictimService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return standard response', async () => {
      const dto = { identifier: 'NN-001' } as any;
      const res = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(res).toEqual({
        success: true,
        statusCode: 201,
        message: 'Víctima registrada exitosamente.',
        data: mockVictim,
      });
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return standard response', async () => {
      const res = await controller.findOne('victim-1');

      expect(service.findOne).toHaveBeenCalledWith('victim-1');
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        data: mockVictim,
      });
    });
  });

  describe('update', () => {
    it('should call service.update and return standard response', async () => {
      const dto = { ageEstimated: 26 } as any;
      const res = await controller.update('victim-1', dto);

      expect(service.update).toHaveBeenCalledWith('victim-1', dto);
      expect(res).toEqual({
        success: true,
        statusCode: 200,
        message: 'Víctima actualizada exitosamente.',
        data: mockVictim,
      });
    });
  });
});
