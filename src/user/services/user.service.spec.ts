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

describe('UserService - updateStatus', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('changes is_active to false and returns the updated user', async () => {
    const user = { id: 'uuid', name: 'John', is_active: true } as UserEntity;
    const updated = { ...user, is_active: false } as UserEntity;
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateStatus('uuid', { is_active: false });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', {
      is_active: false,
    });
    expect(result.is_active).toBe(false);
  });

  it('changes is_active to true', async () => {
    const user = { id: 'uuid', name: 'John', is_active: false } as UserEntity;
    const updated = { ...user, is_active: true } as UserEntity;
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(updated);
    mockRepo.update.mockResolvedValue({ affected: 1 });

    const result = await service.updateStatus('uuid', { is_active: true });

    expect(mockRepo.update).toHaveBeenCalledWith('uuid', { is_active: true });
    expect(result.is_active).toBe(true);
  });

  it('throws BadRequestException when the update affects 0 rows', async () => {
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({ id: 'uuid' } as UserEntity);
    mockRepo.update.mockResolvedValue({ affected: 0 });

    await expect(
      service.updateStatus('uuid', { is_active: false }),
    ).rejects.toThrow(BadRequestException);
  });
});
