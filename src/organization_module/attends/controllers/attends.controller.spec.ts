import { Test, TestingModule } from '@nestjs/testing';
import { AttendsController } from './attends.controller';

describe('AttendsController', () => {
  let controller: AttendsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendsController],
    }).compile();

    controller = module.get<AttendsController>(AttendsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
