import { Test, TestingModule } from '@nestjs/testing';
import { Form207Service } from './form-207.service';

describe('Form207Service', () => {
  let service: Form207Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Form207Service],
    }).compile();

    service = module.get<Form207Service>(Form207Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
