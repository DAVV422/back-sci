import { Test, TestingModule } from '@nestjs/testing';
import { SpecificDatesService } from './specific-dates.service';

describe('SpecificDatesService', () => {
  let service: SpecificDatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpecificDatesService],
    }).compile();

    service = module.get<SpecificDatesService>(SpecificDatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
