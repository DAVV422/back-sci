import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VehicleService } from './vehicle.service';
import { VehicleEntity } from '../entities/vehicle.entity';
import { VehicleDispatchEntity } from '../entities/vehicle-dispatch.entity';
import { ResourceService } from '../../resource/services/resource.service';
import { EmergencyAccessService } from '../../emergency/services/emergency-access.service';

describe('VehicleService', () => {
  let service: VehicleService;
  let vehicleRepo: any;
  let dispatchRepo: any;
  let resourceService: any;
  let manager: any;
  let queryRunner: any;
  let dataSource: any;

  const vehicle = { id: 'veh-1', code: 'AB-3', vehicleType: 'Autobomba', status: 'available', load: [] };

  beforeEach(async () => {
    vehicleRepo = {
      findOne: jest.fn().mockResolvedValue({ ...vehicle }),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (v: any) => ({ id: 'veh-1', ...v })),
      create: jest.fn((v: any) => v),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null),
      })),
    };
    dispatchRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    resourceService = {
      assertCanDispatch: jest.fn().mockResolvedValue({ id: 'emg-1', code: 'EMG-001' }),
      dispatchWithin: jest.fn().mockResolvedValue([{ id: 'res-1', amount: 2, equipment: { name: 'Motobomba' } }]),
      returnWithin: jest.fn().mockResolvedValue(undefined),
      logAction: jest.fn().mockResolvedValue(undefined),
    };
    manager = {
      create: jest.fn((_e: any, data: any) => data),
      save: jest.fn(async (data: any) => ({ id: 'disp-1', ...data })),
      update: jest.fn(),
    };
    queryRunner = {
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(),
      release: jest.fn(), isReleased: false, manager,
    };
    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
      getRepository: jest.fn(() => ({ find: jest.fn().mockResolvedValue([{ id: 'eq-1', name: 'Manguera', totalQuantity: 4 }]) })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: getRepositoryToken(VehicleEntity), useValue: vehicleRepo },
        { provide: getRepositoryToken(VehicleDispatchEntity), useValue: dispatchRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: ResourceService, useValue: resourceService },
        { provide: EmergencyAccessService, useValue: { assertHasCharge: jest.fn() } },
      ],
    }).compile();
    service = module.get(VehicleService);
  });

  describe('dispatch', () => {
    const dto = { vehicleId: 'veh-1', items: [{ equipmentId: 'eq-1', amount: 2 }, { equipmentId: 'eq-2', amount: 0 }] };

    it('crea el despacho y descuenta el equipo a bordo, ligado al vehículo', async () => {
      await service.dispatch('emg-1', dto, 'user-1', 'basic');
      expect(resourceService.dispatchWithin).toHaveBeenCalledWith(
        manager, 'emg-1', [{ equipmentId: 'eq-1', amount: 2 }],
        expect.objectContaining({ vehicleDispatchId: 'disp-1', note: 'A bordo de AB-3' }),
      );
      expect(resourceService.logAction).toHaveBeenCalledWith(manager, 'emg-1', 'user-1', 'Despacho de vehículo AB-3 (Autobomba): Motobomba x2');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('no despacha un vehículo fuera de servicio', async () => {
      vehicleRepo.findOne.mockResolvedValue({ ...vehicle, status: 'out_of_service' });
      await expect(service.dispatch('emg-1', dto, 'user-1')).rejects.toThrow('AB-3 está fuera de servicio.');
      expect(resourceService.dispatchWithin).not.toHaveBeenCalled();
    });

    it('no despacha un vehículo que ya está en otra emergencia, y dice en cuál', async () => {
      dispatchRepo.findOne.mockResolvedValue({ id: 'disp-0', emergency: { code: 'EMG-007' } });
      await expect(service.dispatch('emg-1', dto, 'user-1')).rejects.toThrow('AB-3 ya está en la emergencia EMG-007.');
    });

    it('si otro usuario lo despacha al mismo tiempo (índice único), responde conflicto', async () => {
      manager.save.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
      await expect(service.dispatch('emg-1', dto, 'user-1')).rejects.toThrow('AB-3 ya fue despachado a otra emergencia.');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  it('lista los vehículos despachados a la emergencia aunque no lleven equipo', async () => {
    dispatchRepo.find.mockResolvedValue([{ id: 'disp-1', vehicle: { code: 'AB-3' }, returnedAt: null }]);
    const list = await service.findDispatchesByEmergency('emg-1');
    expect(dispatchRepo.find).toHaveBeenCalledWith(expect.objectContaining({ where: { emergency: { id: 'emg-1' }, isDeleted: false } }));
    expect(list.map((d) => d.id)).toEqual(['disp-1']);
  });

  describe('addItems', () => {
    const resources = [{ id: 'res-1', amount: 2, amount_returned: 0, isDeleted: false, equipment: { id: 'eq-1', name: 'Motobomba' } }];
    beforeEach(() => {
      dispatchRepo.findOne.mockResolvedValue({ id: 'disp-1', vehicle: { code: 'AB-3' }, emergency: { id: 'emg-1' }, resources, returnedAt: null });
    });

    it('agrega equipo a bordo de un vehículo que sigue en la emergencia, sumando a lo que ya lleva', async () => {
      await service.addItems('disp-1', { items: [{ equipmentId: 'eq-1', amount: 2 }] }, 'user-1', 'basic');
      expect(resourceService.assertCanDispatch).toHaveBeenCalledWith('emg-1', 'user-1', 'basic');
      expect(resourceService.dispatchWithin).toHaveBeenCalledWith(
        manager, 'emg-1', [{ equipmentId: 'eq-1', amount: 2 }],
        { note: 'A bordo de AB-3', vehicleDispatchId: 'disp-1', existing: resources },
      );
      expect(resourceService.logAction).toHaveBeenCalledWith(manager, 'emg-1', 'user-1', 'Equipo agregado a AB-3: Motobomba x2');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('no agrega a un vehículo ya devuelto', async () => {
      dispatchRepo.findOne.mockResolvedValue({ id: 'disp-1', vehicle: { code: 'AB-3' }, emergency: { id: 'emg-1' }, resources, returnedAt: new Date() });
      await expect(service.addItems('disp-1', { items: [{ equipmentId: 'eq-1', amount: 1 }] }, 'user-1')).rejects.toThrow('AB-3 ya fue devuelto.');
      expect(resourceService.dispatchWithin).not.toHaveBeenCalled();
    });
  });

  describe('returnVehicle', () => {
    const resources = [
      { id: 'res-1', amount: 2, amount_returned: 0, isDeleted: false, equipment: { name: 'Motobomba' } },
      { id: 'res-2', amount: 6, amount_returned: 0, isDeleted: false, equipment: { name: 'Manguera' } },
    ];
    beforeEach(() => {
      dispatchRepo.findOne.mockResolvedValue({ id: 'disp-1', vehicle: { code: 'AB-3' }, emergency: { id: 'emg-1' }, resources, returnedAt: null });
    });

    it('sin detalle devuelve todo y libera el vehículo', async () => {
      await service.returnVehicle('disp-1', {}, 'user-1');
      expect(resourceService.returnWithin).toHaveBeenCalledWith(manager, resources[0], 2);
      expect(resourceService.returnWithin).toHaveBeenCalledWith(manager, resources[1], 6);
      expect(manager.update).toHaveBeenCalledWith(VehicleDispatchEntity, { id: 'disp-1' }, { returnedAt: expect.any(Date) });
      expect(resourceService.logAction).toHaveBeenCalledWith(manager, 'emg-1', 'user-1', 'Vehículo AB-3 devuelto con todo su equipo');
    });

    it('con detalle, lo que no vuelve queda pendiente y se anota', async () => {
      await service.returnVehicle('disp-1', { items: [{ resourceId: 'res-2', amountReturned: 5 }] }, 'user-1');
      expect(resourceService.returnWithin).toHaveBeenCalledWith(manager, resources[1], 5);
      expect(resourceService.logAction).toHaveBeenCalledWith(manager, 'emg-1', 'user-1', 'Vehículo AB-3 devuelto (sin devolver: Manguera x1)');
    });

    it('no se devuelve dos veces', async () => {
      dispatchRepo.findOne.mockResolvedValue({ id: 'disp-1', vehicle: { code: 'AB-3' }, emergency: { id: 'emg-1' }, resources, returnedAt: new Date() });
      await expect(service.returnVehicle('disp-1', {}, 'user-1')).rejects.toThrow('AB-3 ya fue devuelto.');
    });
  });

  it('la carga estándar no puede superar el total del inventario', async () => {
    await expect(service.create({ code: 'AB-3', vehicleType: 'Autobomba', load: [{ equipmentId: 'eq-1', quantity: 5 }] }))
      .rejects.toThrow('Manguera: el inventario tiene 4 en total');
  });
});
