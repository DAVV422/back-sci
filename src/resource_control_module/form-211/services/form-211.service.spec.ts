import { Test, TestingModule } from '@nestjs/testing';
import { Form211Service } from './form-211.service';

describe('Form211Service', () => {
  let service: Form211Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Form211Service],
    }).compile();

    service = module.get<Form211Service>(Form211Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
