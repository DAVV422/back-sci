import { Test, TestingModule } from '@nestjs/testing';
import { ProvidedService } from './provided.service';

describe('ProvidedService', () => {
  let service: ProvidedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvidedService],
    }).compile();

    service = module.get<ProvidedService>(ProvidedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
