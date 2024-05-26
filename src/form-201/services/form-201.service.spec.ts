import { Test, TestingModule } from '@nestjs/testing';
import { Form201Service } from './form-201.service';

describe('Form201Service', () => {
  let service: Form201Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Form201Service],
    }).compile();

    service = module.get<Form201Service>(Form201Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
