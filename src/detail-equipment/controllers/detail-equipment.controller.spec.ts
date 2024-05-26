import { Test, TestingModule } from '@nestjs/testing';
import { DetailEquipmentController } from './detail-equipment.controller';

describe('DetailEquipmentController', () => {
  let controller: DetailEquipmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DetailEquipmentController],
    }).compile();

    controller = module.get<DetailEquipmentController>(DetailEquipmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
