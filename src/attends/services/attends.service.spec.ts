import { Test, TestingModule } from '@nestjs/testing';
import { AttendsService } from './attends.service';

describe('AttendsService', () => {
  let service: AttendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendsService],
    }).compile();

    service = module.get<AttendsService>(AttendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
