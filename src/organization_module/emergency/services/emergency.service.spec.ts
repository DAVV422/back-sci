import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { EmergencyService } from './emergency.service';
import { EmergencyStateMachine } from './emergency-state-machine';
import { EmergencyEntity } from '../entities/emergency.entity';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { CreateEmergencyDto } from '../dto/create-emergency.dto';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { UserService } from '../../../user/services/user.service';
import { ROLES } from '../../../common/constants';
import { QueryDto } from '../../../common/dto/query.dto';

describe('EmergencyService', () => {
  let service: EmergencyService;
  let queryBuilder: any;
  let mockRepo: any;
  let mockUserService: any;
  let mockManager: any;
  let queryRunner: any;
  let mockActionRepo: any;

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
      save: jest.fn(),
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
    mockActionRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (data: any) => ({ id: 'action-1', ...data })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencyService,
        { provide: getRepositoryToken(EmergencyEntity), useValue: mockRepo },
        { provide: getRepositoryToken(ActionEntity), useValue: mockActionRepo },
        { provide: UserService, useValue: mockUserService },
        { provide: DataSource, useValue: mockDataSource },
        EmergencyStateMachine,
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

  describe('create - default state', () => {
    let lastSaved: any;

    beforeEach(() => {
      lastSaved = null;
      mockUserService.findOne.mockResolvedValue({ id: 'user-1' });
      queryRunner.query.mockResolvedValue([{ next_val: 1 }]);
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

    it('asigna state = p (Pending) al crear una emergencia sin el campo state', async () => {
      await service.create(
        {
          name: 'Incendio',
          date: new Date('2024-06-19'),
          hour: '14:30',
          type: 'Incendio',
        } as CreateEmergencyDto,
        'user-1',
      );

      expect(lastSaved.state).toBe(EmergencyStatus.Pending);
    });

    it('ignora el state enviado por el cliente y asigna p (Pending)', async () => {
      await service.create(
        {
          name: 'Incendio',
          date: new Date('2024-06-19'),
          hour: '14:30',
          type: 'Incendio',
          state: EmergencyStatus.Active,
        } as any,
        'user-1',
      );

      expect(lastSaved.state).toBe(EmergencyStatus.Pending);
    });
  });

  describe('CreateEmergencyDto', () => {
    it('no acepta el campo code del cliente', () => {
      const instance = new CreateEmergencyDto();
      expect(instance).not.toHaveProperty('code');
    });

    it('no acepta el campo state del cliente', () => {
      const instance = new CreateEmergencyDto();
      expect(instance).not.toHaveProperty('state');
    });
  });

  describe('changeState - máquina de estados', () => {
    const emergencyId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';
    const userId = '3f2b5f1a-9e8d-4c7b-a6e5-1d2c3b4a5f6e';

    const makeEmergency = (state: EmergencyStatus, forms?: any) => ({
      id: emergencyId,
      code: 'EMG-001',
      name: 'Incendio',
      state,
      form201: forms?.form201 ?? [],
      form207: forms?.form207 ?? [],
    });

    beforeEach(() => {
      mockUserService.findOne.mockResolvedValue({ id: userId });
      mockRepo.save.mockImplementation(async (data: any) => data);
    });

    it('p → a: transición exitosa y registra acción de activación', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Pending));

      await service.changeState(
        emergencyId,
        { state: EmergencyStatus.Active } as any,
        userId,
        ROLES.BASIC,
      );

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: EmergencyStatus.Active }),
      );
      expect(mockActionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Emergencia activada' }),
      );
    });

    it('p → f: lanza BadRequestException (transición no permitida)', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Pending));

      await expect(
        service.changeState(
          emergencyId,
          { state: EmergencyStatus.Finished } as any,
          userId,
          ROLES.BASIC,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('p → c sin motivo: lanza BadRequestException', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Pending));

      await expect(
        service.changeState(
          emergencyId,
          { state: EmergencyStatus.Canceled } as any,
          userId,
          ROLES.BASIC,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('p → c con motivo: transición exitosa y registra motivo en ActionEntity', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Pending));

      await service.changeState(
        emergencyId,
        { state: EmergencyStatus.Canceled, cancellation_reason: 'Falso reporte' } as any,
        userId,
        ROLES.BASIC,
      );

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: EmergencyStatus.Canceled }),
      );
      expect(mockActionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Emergencia cancelada: Falso reporte',
        }),
      );
    });

    it('a → f con formularios sin finalizar: lanza BadRequestException con lista', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Active, {
          form201: [{ id: 'f201-1', is_finalized: false }],
        }),
      );

      await expect(
        service.changeState(
          emergencyId,
          { state: EmergencyStatus.Finished } as any,
          userId,
          ROLES.BASIC,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('a → f con formularios finalizados: transición exitosa', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Active, {
          form201: [{ id: 'f201-1', is_finalized: true }],
          form207: [{ id: 'f207-1', is_finalized: true }],
        }),
      );

      await service.changeState(
        emergencyId,
        { state: EmergencyStatus.Finished } as any,
        userId,
        ROLES.BASIC,
      );

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: EmergencyStatus.Finished }),
      );
    });

    it('a → c con motivo: transición exitosa', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Active));

      await service.changeState(
        emergencyId,
        { state: EmergencyStatus.Canceled, cancellation_reason: 'Orden superior' } as any,
        userId,
        ROLES.BASIC,
      );

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: EmergencyStatus.Canceled }),
      );
    });

    it('f → a con rol MANAGER: transición exitosa y registra reapertura', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Finished));

      await service.changeState(
        emergencyId,
        { state: EmergencyStatus.Active } as any,
        userId,
        ROLES.MANAGER,
      );

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: EmergencyStatus.Active }),
      );
      expect(mockActionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Emergencia reabierta' }),
      );
    });

    it('f → a con rol BASIC: lanza ForbiddenException', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Finished));

      await expect(
        service.changeState(
          emergencyId,
          { state: EmergencyStatus.Active } as any,
          userId,
          ROLES.BASIC,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('f → c: lanza BadRequestException (transición no permitida)', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Finished));

      await expect(
        service.changeState(
          emergencyId,
          { state: EmergencyStatus.Canceled } as any,
          userId,
          ROLES.MANAGER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('c → a: lanza BadRequestException (estado terminal)', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Canceled));

      await expect(
        service.changeState(
          emergencyId,
          { state: EmergencyStatus.Active } as any,
          userId,
          ROLES.BASIC,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('c → f: lanza BadRequestException (estado terminal)', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Canceled));

      await expect(
        service.changeState(
          emergencyId,
          { state: EmergencyStatus.Finished } as any,
          userId,
          ROLES.BASIC,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
