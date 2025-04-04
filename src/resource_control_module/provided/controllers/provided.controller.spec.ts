import { Test, TestingModule } from '@nestjs/testing';
import { ProvidedController } from './provided.controller';

describe('ProvidedController', () => {
  let controller: ProvidedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidedController],
    }).compile();

    controller = module.get<ProvidedController>(ProvidedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
