import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { EmergencyService } from './emergency.service';
import { TRANSFER_BRIEFING_KEYS } from '../transfer-briefing';
import { EmergencyStateMachine } from './emergency-state-machine';
import { EmergencyAccessService } from './emergency-access.service';
import { EmergencyEntity } from '../entities/emergency.entity';
import { ActionEntity } from '../../../incident_module/action/entities/action.entity';
import { CreateEmergencyDto } from '../dto/create-emergency.dto';
import { EmergencyStatus } from '../enums/emergency-status.enum';
import { UserService } from '../../../user/services/user.service';
import { ROLES } from '../../../common/constants';
import { QueryDto } from '../../../common/dto/query.dto';

describe('EmergencyService', () => {
  const mockEmergencyAccessService = {
    assertMember: jest.fn().mockResolvedValue(undefined),
    assertHasCharge: jest.fn().mockResolvedValue(undefined),
    assertCommanderOrManager: jest.fn().mockResolvedValue(undefined),
    assertCanViewPatients: jest.fn().mockResolvedValue(undefined),
    isManagerOrAbove: jest.fn((role: string) => ['manager', 'admin', 'suadmin'].includes(role)),
  };
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
      addOrderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
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
        { provide: EmergencyAccessService, useValue: mockEmergencyAccessService },
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
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
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
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Pending),
      );

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
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Pending),
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

    it('p → c sin motivo: lanza BadRequestException', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Pending),
      );

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
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Pending),
      );

      await service.changeState(
        emergencyId,
        {
          state: EmergencyStatus.Canceled,
          cancellationReason: 'Falso reporte',
        } as any,
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
          form201: [{ id: 'f201-1', isFinalized: false }],
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
          form201: [{ id: 'f201-1', isFinalized: true }],
          form207: [{ id: 'f207-1', isFinalized: true }],
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
        {
          state: EmergencyStatus.Canceled,
          cancellationReason: 'Orden superior',
        } as any,
        userId,
        ROLES.BASIC,
      );

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ state: EmergencyStatus.Canceled }),
      );
    });

    it('f → a con rol MANAGER: transición exitosa y registra reapertura', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Finished),
      );

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
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Finished),
      );

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
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Finished),
      );

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
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Canceled),
      );

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
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Canceled),
      );

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

  describe('update - bloqueo de edición (F1-011)', () => {
    const makeEmergency = (state: EmergencyStatus) => ({
      id: 'emg-1',
      code: 'EMG-001',
      name: 'Incendio',
      state,
    });

    beforeEach(() => {
      mockRepo.update = jest.fn().mockResolvedValue({ affected: 1 });
    });

    it('lanza BadRequestException al editar una emergencia finalizada', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Finished),
      );

      await expect(
        service.update('emg-1', { name: 'Nuevo nombre' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException al editar una emergencia cancelada', async () => {
      mockRepo.findOne.mockResolvedValue(
        makeEmergency(EmergencyStatus.Canceled),
      );

      await expect(
        service.update('emg-1', { name: 'Nuevo nombre' } as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('permite editar una emergencia pendiente o activa', async () => {
      mockRepo.findOne.mockResolvedValue(makeEmergency(EmergencyStatus.Active));

      const result = await service.update('emg-1', {
        name: 'Nuevo nombre',
      } as any);

      expect(mockRepo.update).toHaveBeenCalled();
      expect(result.state).toBe(EmergencyStatus.Active);
    });
  });

  describe('assertEditable (F1-011)', () => {
    const makeEmergency = (state: EmergencyStatus) => ({
      id: 'emg-1',
      state,
    });

    it('no lanza para estado pendiente', () => {
      expect(() =>
        service.assertEditable(makeEmergency(EmergencyStatus.Pending) as any),
      ).not.toThrow();
    });

    it('no lanza para estado activo', () => {
      expect(() =>
        service.assertEditable(makeEmergency(EmergencyStatus.Active) as any),
      ).not.toThrow();
    });

    it('lanza BadRequestException para estado finalizado', () => {
      expect(() =>
        service.assertEditable(makeEmergency(EmergencyStatus.Finished) as any),
      ).toThrow(BadRequestException);
    });

    it('lanza BadRequestException para estado cancelado', () => {
      expect(() =>
        service.assertEditable(makeEmergency(EmergencyStatus.Canceled) as any),
      ).toThrow(BadRequestException);
    });
  });

  describe('delete - soft delete (F1-012)', () => {
    it('marca is_deleted = true en vez de borrar físicamente', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'emg-1',
        code: 'EMG-001',
        state: EmergencyStatus.Pending,
      });
      mockRepo.update = jest.fn().mockResolvedValue({ affected: 1 });

      const result = await service.delete('emg-1');

      expect(mockRepo.update).toHaveBeenCalledWith('emg-1', {
        isDeleted: true,
      });
      expect(mockRepo.delete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('lanza BadRequestException si el update no afecta filas', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'emg-1' });
      mockRepo.update = jest.fn().mockResolvedValue({ affected: 0 });

      await expect(service.delete('emg-1')).rejects.toThrow(
        'Emergencia no eliminada.',
      );
    });
  });

  describe('findAll - excluye registros soft-deleted (F1-012)', () => {
    it('agrega filtro is_deleted = false a la query', async () => {
      await service.findAll({} as QueryDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'emergency.is_deleted = false',
      );
    });
  });

  describe('findAll - KPI de víctimas (B3)', () => {
    it('agrega victimsCount por emergencia y 0 a las que no tienen registros', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'e-1' }, { id: 'e-2' }], 2]);
      mockRepo.query.mockResolvedValue([{ emergency_id: 'e-1', victims: '3' }]);

      const { items } = await service.findAll({} as QueryDto);

      expect(items).toEqual([
        expect.objectContaining({ id: 'e-1', victimsCount: 3 }),
        expect.objectContaining({ id: 'e-2', victimsCount: 0 }),
      ]);
      expect(mockRepo.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(DISTINCT r.victim_id)'), [['e-1', 'e-2']]);
    });

    it('ordena por el instante de inicio (occurred_at)', async () => {
      await service.findAll({} as QueryDto);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('emergency.occurredAt', 'DESC', 'NULLS LAST');
    });
  });

  describe('autorización (P0)', () => {
    it('changeState exige CI activo o manager+ antes de validar la transición', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'emg-1',
        state: EmergencyStatus.Pending,
        form201: [],
        form207: [],
      });
      mockEmergencyAccessService.assertCommanderOrManager.mockRejectedValueOnce(
        new ForbiddenException('sin permiso'),
      );

      await expect(
        service.changeState('emg-1', { state: EmergencyStatus.Active } as any, 'user-x', ROLES.BASIC),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('update con rol informado exige CI activo o manager+', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'emg-1', state: EmergencyStatus.Active } as any);
      mockEmergencyAccessService.assertCommanderOrManager.mockRejectedValueOnce(
        new ForbiddenException('sin permiso'),
      );

      await expect(
        service.update('emg-1', { name: 'Otro' } as any, 'user-x', ROLES.BASIC),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });
  describe('traspaso de mando (P1 #6)', () => {
    const open201 = { id: 'f201-1', code: 'F201-1', isFinalized: false, emergency: { id: 'emg-1' } };
    const open207 = { id: 'f207-1', code: 'F207-1', isFinalized: false, emergency: { id: 'emg-1' } };

    it('findPendingForms devuelve solo id y código de los abiertos', async () => {
      mockRepo.manager = {
        find: jest.fn()
          .mockResolvedValueOnce([{ ...open201, notes: 'x' }])
          .mockResolvedValueOnce([open207]),
      };
      await expect(service.findPendingForms('emg-1')).resolves.toEqual({
        form201: [{ id: 'f201-1', code: 'F201-1' }],
        form207: [{ id: 'f207-1', code: 'F207-1' }],
      });
      expect(mockRepo.manager.find).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ where: { emergency: { id: 'emg-1' }, isFinalized: false, isDeleted: false } }),
      );
    });

    it('transferCommand rechaza el traspaso si queda un F207 abierto y lista los códigos', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'emg-1', state: EmergencyStatus.Active } as any);
      jest.spyOn(service, 'findTransferBlockers').mockResolvedValue([]);
      jest.spyOn(service, 'findPendingForms').mockResolvedValue({
        form201: [],
        form207: [{ id: 'f207-1', code: 'F207-1' }],
      });
      await expect(
        service.transferCommand('emg-1', { newCommanderUserId: 'u-2', briefing: TRANSFER_BRIEFING_KEYS } as any, 'u-1', ROLES.MANAGER),
      ).rejects.toThrow(/F207-1/);
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    describe('casillas mínimas del 201 antes de traspasar', () => {
      const assumedAt = new Date('2026-10-03T10:00:00Z');
      const complete = {
        id: 'emg-1', state: EmergencyStatus.Active, location_description: 'Sector Norte',
        coordinates: ['-68.1', '-16.5'], coordinates_pc: ['-68.11', '-16.51'],
        form201: [{ id: 'f1', isDeleted: false, createdAt: new Date('2026-10-03T10:30:00Z') }],
      };
      beforeEach(() => {
        mockRepo.manager = { findOne: jest.fn().mockResolvedValue({ occurredAt: new Date('2026-10-03T10:00:00Z'), createdAt: assumedAt }) };
      });

      it('sin bloqueos cuando el CI preparó su 201 y están el lugar y el PC', async () => {
        await expect(service.findTransferBlockers(complete as any)).resolves.toEqual([]);
      });

      it('exige el lugar (3), el PC (6) y un 201 preparado durante el mando actual', async () => {
        const blockers = await service.findTransferBlockers({
          ...complete, location_description: ' ', coordinates: [], coordinates_pc: null,
          form201: [{ id: 'f0', isDeleted: false, createdAt: new Date('2026-10-03T09:00:00Z') }], // del mando anterior
        } as any);
        expect(blockers).toEqual([
          expect.stringContaining('Casilla 3'),
          expect.stringContaining('Casilla 6'),
          expect.stringContaining('Formulario 201 del mando actual'),
        ]);
      });

      it('un 201 de segundos antes de asumir (mismo minuto) es del mando anterior', async () => {
        mockRepo.manager.findOne.mockResolvedValue({
          occurredAt: new Date('2026-10-03T10:30:00Z'), createdAt: new Date('2026-10-03T10:30:40Z'),
        });
        const blockers = await service.findTransferBlockers({
          ...complete, form201: [{ id: 'f1', isDeleted: false, createdAt: new Date('2026-10-03T10:30:10Z') }],
        } as any);
        expect(blockers).toEqual([expect.stringContaining('Formulario 201 del mando actual')]);
      });

      it('exige confirmar todos los temas de la lista de transferencia del manual', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValue(complete as any);
        await expect(
          service.transferCommand(
            'emg-1',
            { newCommanderUserId: 'u-2', briefing: TRANSFER_BRIEFING_KEYS.filter((k) => k !== 'probable_evolution') } as any,
            'u-1',
            ROLES.MANAGER,
          ),
        ).rejects.toThrow(/Probable evolución/);
        expect(queryRunner.startTransaction).not.toHaveBeenCalled();
      });

      it('transferCommand no avanza si hay bloqueos', async () => {
        jest.spyOn(service, 'findOne').mockResolvedValue({ ...complete, coordinates_pc: null } as any);
        await expect(
          service.transferCommand('emg-1', { newCommanderUserId: 'u-2', briefing: TRANSFER_BRIEFING_KEYS } as any, 'u-1', ROLES.MANAGER),
        ).rejects.toThrow(/Casilla 6/);
        expect(queryRunner.startTransaction).not.toHaveBeenCalled();
      });
    });

    it('finalizeAllForms cierra F201 y F207 en una transacción y deja constancia en la bitácora', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'emg-1', state: EmergencyStatus.Active } as any);
      mockManager.find = jest.fn()
        .mockResolvedValueOnce([{ ...open201 }])
        .mockResolvedValueOnce([{ ...open207 }]);
      mockManager.create.mockImplementation((_e: any, data: any) => data);

      const result = await service.finalizeAllForms('emg-1', 'u-1', ROLES.MANAGER);

      expect(result).toEqual({
        form201: [{ id: 'f201-1', code: 'F201-1' }],
        form207: [{ id: 'f207-1', code: 'F207-1' }],
      });
      const saved = mockManager.save.mock.calls.slice(0, 2).flatMap(([forms]: any[]) => forms);
      expect(saved.every((f: any) => f.isFinalized)).toBe(true);
      expect(saved[0].finalizedAt).toEqual(expect.any(Date)); // F201: fin del periodo del mando
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: expect.stringContaining('F201-1, F207-1') }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('finalizeAllForms exige CI activo o manager+', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'emg-1', state: EmergencyStatus.Active } as any);
      mockEmergencyAccessService.assertCommanderOrManager.mockRejectedValueOnce(
        new ForbiddenException('sin permiso'),
      );
      await expect(service.finalizeAllForms('emg-1', 'u-x', ROLES.BASIC)).rejects.toThrow(ForbiddenException);
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('finalizeAllForms no opera sobre una emergencia cerrada', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'emg-1', state: EmergencyStatus.Finished } as any);
      await expect(service.finalizeAllForms('emg-1', 'u-1', ROLES.MANAGER)).rejects.toThrow();
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });
  });
});
