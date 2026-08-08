import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserService } from './user.service';
import { UserEntity } from '../entities/user.entity';
import { QueryDto } from '../../common/dto/query.dto';

describe('UserService - whitelist QueryDto.attr', () => {
  let service: UserService;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
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
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('rejects attr not in the user whitelist with BadRequestException', async () => {
    const queryDto: QueryDto = { attr: 'password', value: 'x' } as any;
    await expect(service.findAll(queryDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(queryBuilder.where).not.toHaveBeenCalled();
  });

  it('runs without error for a valid attr in the user whitelist', async () => {
    const queryDto: QueryDto = { attr: 'name', value: 'juan' } as any;
    await expect(service.findAll(queryDto)).resolves.toEqual({
      items: [],
      total: 0,
    });
  });
});
