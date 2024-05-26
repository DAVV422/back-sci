import { Test, TestingModule } from '@nestjs/testing';
import { Form207Controller } from './form-207.controller';

describe('Form207Controller', () => {
  let controller: Form207Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Form207Controller],
    }).compile();

    controller = module.get<Form207Controller>(Form207Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
