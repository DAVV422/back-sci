import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

import { VictimService } from './victim.service';
import { VictimEntity } from '../entities/victim.entity';

describe('VictimService', () => {
  let service: VictimService;
  let repo: jest.Mocked<Repository<VictimEntity>>;

  const mockVictim = {
    id: 'victim-1',
    identifier: 'NN-001',
    ageEstimated: 35,
    gender: 'Femenino',
    isDeleted: false,
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VictimService,
        { provide: getRepositoryToken(VictimEntity), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<VictimService>(VictimService);
    repo = module.get(getRepositoryToken(VictimEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a victim', async () => {
      const dto = { identifier: 'NN-001' } as any;
      repo.save.mockResolvedValue({ id: 'victim-1', ...dto });

      const result = await service.create(dto);
      expect(result).toHaveProperty('id', 'victim-1');
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return the victim if active', async () => {
      repo.findOne.mockResolvedValue(mockVictim as any);

      const result = await service.findOne('victim-1');
      expect(result).toEqual(mockVictim);
    });

    it('should throw NotFoundException if victim not found or deleted', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('victim-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should perform a soft-delete', async () => {
      repo.findOne.mockResolvedValue(mockVictim as any);
      repo.update.mockResolvedValue({ affected: 1 } as any);

      await service.remove('victim-1');
      expect(repo.update).toHaveBeenCalledWith('victim-1', { isDeleted: true });
    });
  });
});
