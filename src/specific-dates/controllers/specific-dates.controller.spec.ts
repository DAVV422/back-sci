import { Test, TestingModule } from '@nestjs/testing';
import { SpecificDatesController } from './specific-dates.controller';

describe('SpecificDatesController', () => {
  let controller: SpecificDatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecificDatesController],
    }).compile();

    controller = module.get<SpecificDatesController>(SpecificDatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
