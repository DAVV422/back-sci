import { Test, TestingModule } from '@nestjs/testing';
import { Form211Controller } from './form-211.controller';

describe('Form211Controller', () => {
  let controller: Form211Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Form211Controller],
    }).compile();

    controller = module.get<Form211Controller>(Form211Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
