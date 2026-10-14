import { SyncService } from './sync.service';

/**
 * El lote offline debe pasar por las mismas validaciones tácticas que la web: los servicios solo
 * las aplican si reciben el rol, así que el SyncService debe propagar usuario y rol a cada uno.
 */
describe('SyncService - propagación de usuario y rol (P0)', () => {
  const EMG = '01b9bbf4-41a6-4820-abd4-9df61a2d6356';
  let service: SyncService;
  const mocks = {
    emergency: { findOne: jest.fn().mockResolvedValue({ id: EMG, state: 'a', code: 'EMG-001' }) },
    form201: { create: jest.fn().mockResolvedValue({ id: 'f201' }), update: jest.fn().mockResolvedValue({ id: 'f201' }) },
    form207: { create: jest.fn().mockResolvedValue({ id: 'f207' }) },
    victim: { create: jest.fn().mockResolvedValue({ id: 'v' }), update: jest.fn().mockResolvedValue({ id: 'v' }) },
    registration: { create: jest.fn().mockResolvedValue({ id: 'r' }) },
    action: { create: jest.fn().mockResolvedValue({ id: 'a' }), update: jest.fn().mockResolvedValue({ id: 'a' }) },
    notification: { sendNotification: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SyncService(
      mocks.emergency as any,
      mocks.form201 as any,
      mocks.form207 as any,
      mocks.victim as any,
      mocks.registration as any,
      mocks.action as any,
      mocks.notification as any,
    );
  });

  const op = (entity: string, action: string, payload: object) => ({
    entity, action, clientGeneratedId: `${entity}-${action}`, emergencyId: EMG, payload,
  });

  it('pasa userId y userRole a cada servicio que valida permisos tácticos', async () => {
    await service.processBatch(
      {
        operations: [
          op('form201', 'create', {}),
          op('form201', 'update', { id: 'f201' }),
          op('form207', 'create', {}),
          op('victim', 'update', { id: 'v' }),
          op('registration', 'create', { form207Id: 'f207' }),
          op('action', 'create', { description: 'x' }),
          op('action', 'update', { id: 'a' }),
        ],
      } as any,
      'user-1',
      'basic',
    );

    expect(mocks.form201.create).toHaveBeenCalledWith(EMG, expect.anything(), 'user-1', 'basic');
    expect(mocks.form201.update).toHaveBeenCalledWith('f201', expect.anything(), 'user-1', 'basic');
    expect(mocks.form207.create).toHaveBeenCalledWith(EMG, expect.anything(), 'user-1', 'basic');
    expect(mocks.victim.update).toHaveBeenCalledWith('v', expect.anything(), 'user-1', 'basic');
    expect(mocks.registration.create).toHaveBeenCalledWith('f207', expect.anything(), 'user-1', 'basic');
    expect(mocks.action.create).toHaveBeenCalledWith(expect.anything(), 'user-1', 'basic');
    expect(mocks.action.update).toHaveBeenCalledWith('a', expect.anything(), 'user-1', 'basic');
  });
});
