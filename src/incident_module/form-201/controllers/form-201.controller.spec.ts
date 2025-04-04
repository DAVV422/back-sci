import { Test, TestingModule } from '@nestjs/testing';
import { Form201Controller } from './form-201.controller';

describe('Form201Controller', () => {
  let controller: Form201Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Form201Controller],
    }).compile();

    controller = module.get<Form201Controller>(Form201Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
