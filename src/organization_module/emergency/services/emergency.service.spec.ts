import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { EmergencyService } from './emergency.service';
import { EmergencyEntity } from '../entities/emergency.entity';
import { CreateEmergencyDto } from '../dto/create-emergency.dto';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { UserService } from '../../../user/services/user.service';
import { QueryDto } from '../../../common/dto/query.dto';

describe('EmergencyService', () => {
  let service: EmergencyService;
  let queryBuilder: any;
  let mockRepo: any;
  let mockUserService: any;
  let mockManager: any;
  let queryRunner: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
    };
    mockUserService = {
      findOne: jest.fn(),
    };
    mockManager = {
      create: jest.fn(),
      save: jest.fn(),
    };
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      manager: mockManager,
    };
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyService,
        { provide: getRepositoryToken(EmergencyEntity), useValue: mockRepo },
        { provide: UserService, useValue: mockUserService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<EmergencyService>(EmergencyService);
  });

  describe('findAll - whitelist QueryDto.attr', () => {
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

  describe('create - auto-generated code', () => {
    const dto = {
      name: 'Incendio',
      date: new Date('2024-06-19'),
      hour: '14:30',
      type: 'Incendio',
      state: EmergencyStatus.Active,
    } as CreateEmergencyDto;
    let lastSaved: any;

    beforeEach(() => {
      lastSaved = null;
      mockUserService.findOne.mockResolvedValue({ id: 'user-1' });
      mockManager.create.mockImplementation((entity: any, data: any) => ({
        ...data,
      }));
      mockManager.save.mockImplementation(async (data: any) => {
        lastSaved = { id: 'emg-1', ...data };
        return lastSaved;
      });
      mockRepo.findOne.mockImplementation(async ({ where }: any) => ({
        id: where.id,
        ...lastSaved,
      }));
    });

    it('genera códigos correlativos EMG-001, EMG-002, EMG-003 en creaciones secuenciales', async () => {
      const codes: string[] = [];
      queryRunner.query.mockImplementation(async () => [
        { next_val: codes.length + 1 },
      ]);
      mockManager.save.mockImplementation(async (data: any) => {
        codes.push(data.code);
        lastSaved = { id: `emg-${codes.length}`, ...data };
        return lastSaved;
      });

      await service.create(dto, 'user-1');
      await service.create(dto, 'user-1');
      await service.create(dto, 'user-1');

      expect(codes).toEqual(['EMG-001', 'EMG-002', 'EMG-003']);
    });

    it('extiende el formato naturalmente al superar 999 emergencias', async () => {
      queryRunner.query.mockResolvedValue([{ next_val: 1000 }]);

      await service.create(dto, 'user-1');

      expect(lastSaved.code).toBe('EMG-1000');
    });

    it('persiste el código dentro de una transacción', async () => {
      queryRunner.query.mockResolvedValue([{ next_val: 5 }]);

      await service.create(dto, 'user-1');

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1',
        ),
      );
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'EMG-005' }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('hace rollback y propaga el error si falla la creación', async () => {
      queryRunner.query.mockResolvedValue([{ next_val: 1 }]);
      mockManager.save.mockRejectedValue(new Error('db error'));

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('CreateEmergencyDto', () => {
    it('no acepta el campo code del cliente', () => {
      const instance = new CreateEmergencyDto();
      expect(instance).not.toHaveProperty('code');
    });
  });
});
