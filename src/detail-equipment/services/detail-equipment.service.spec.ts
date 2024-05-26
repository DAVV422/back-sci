import { Test, TestingModule } from '@nestjs/testing';
import { DetailEquipmentService } from './detail-equipment.service';

describe('DetailEquipmentService', () => {
  let service: DetailEquipmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DetailEquipmentService],
    }).compile();

    service = module.get<DetailEquipmentService>(DetailEquipmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
