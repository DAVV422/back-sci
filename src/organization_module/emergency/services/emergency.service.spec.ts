import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { EmergencyService } from './emergency.service';
import { EmergencyEntity } from '../entities/emergency.entity';
import { UserService } from '../../../user/services/user.service';
import { QueryDto } from '../../../common/dto/query.dto';

describe('EmergencyService - whitelist QueryDto.attr', () => {
  let service: EmergencyService;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyService,
        { provide: getRepositoryToken(EmergencyEntity), useValue: mockRepo },
        { provide: UserService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmergencyService>(EmergencyService);
  });

  it('rejects attr not in the emergency whitelist with BadRequestException', async () => {
    const queryDto: QueryDto = { attr: '; DROP TABLE--', value: 'x' } as any;
    await expect(service.findAll(queryDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(queryBuilder.where).not.toHaveBeenCalled();
  });

  it('runs without error for a valid attr in the emergency whitelist', async () => {
    const queryDto: QueryDto = { attr: 'state', value: 'active' } as any;
    await expect(service.findAll(queryDto)).resolves.toEqual({
      items: [],
      total: 0,
    });
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'emergency.state ILIKE :value',
      { value: '%active%' },
    );
  });
});
