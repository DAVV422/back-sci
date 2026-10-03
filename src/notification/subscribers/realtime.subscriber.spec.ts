import { ActionEntity } from '../../incident_module/action/entities/action.entity';
import { EmergencyEntity } from '../../organization_module/emergency/entities/emergency.entity';
import { RegistrationEntity } from '../../victim_registry_module/registration/entities/registration.entity';
import { UserEntity } from '../../user/entities/user.entity';
import { RealtimeSubscriber } from './realtime.subscriber';

describe('RealtimeSubscriber', () => {
  let subscriber: RealtimeSubscriber;
  let realtimeService: { notifyEmergency: jest.Mock };

  const buildQueryRunner = (isTransactionActive: boolean) =>
    ({ isTransactionActive, data: {} } as any);

  const insertEvent = (target: unknown, entity: any, queryRunner: any) =>
    ({ metadata: { target }, entity, queryRunner } as any);

  beforeEach(() => {
    realtimeService = { notifyEmergency: jest.fn() };
    subscriber = new RealtimeSubscriber(
      { subscribers: [] } as any,
      realtimeService as any,
    );
  });

  it('encola dentro de la transacción y emite solo tras el commit', () => {
    const qr = buildQueryRunner(true);
    subscriber.afterInsert(
      insertEvent(ActionEntity, { id: 'a-1', emergency: { id: 'em-1' } }, qr),
    );
    expect(realtimeService.notifyEmergency).not.toHaveBeenCalled();

    subscriber.afterTransactionCommit({ queryRunner: qr } as any);
    expect(realtimeService.notifyEmergency).toHaveBeenCalledWith(
      'em-1',
      'action',
      'insert',
      'a-1',
    );
  });

  it('descarta los eventos encolados si la transacción hace rollback', () => {
    const qr = buildQueryRunner(true);
    subscriber.afterInsert(
      insertEvent(ActionEntity, { id: 'a-1', emergency: { id: 'em-1' } }, qr),
    );
    subscriber.afterTransactionRollback({ queryRunner: qr } as any);
    subscriber.afterTransactionCommit({ queryRunner: qr } as any);
    expect(realtimeService.notifyEmergency).not.toHaveBeenCalled();
  });

  it('emite de inmediato si no hay transacción activa', () => {
    subscriber.afterInsert(
      insertEvent(EmergencyEntity, { id: 'em-1' }, buildQueryRunner(false)),
    );
    expect(realtimeService.notifyEmergency).toHaveBeenCalledWith(
      'em-1',
      'emergency',
      'insert',
      'em-1',
    );
  });

  it('resuelve la emergencia del triage a través del Formulario 207', () => {
    subscriber.afterInsert(
      insertEvent(
        RegistrationEntity,
        { id: 'r-1', form207: { emergency: { id: 'em-9' } } },
        buildQueryRunner(false),
      ),
    );
    expect(realtimeService.notifyEmergency).toHaveBeenCalledWith(
      'em-9',
      'registration',
      'insert',
      'r-1',
    );
  });

  it('marca como delete un update que aplica soft delete', () => {
    subscriber.afterUpdate({
      metadata: { target: ActionEntity },
      entity: { id: 'a-1', isDeleted: true, emergency: { id: 'em-1' } },
      queryRunner: buildQueryRunner(false),
    } as any);
    expect(realtimeService.notifyEmergency).toHaveBeenCalledWith(
      'em-1',
      'action',
      'delete',
      'a-1',
    );
  });

  it('ignora entidades sin emergencia resoluble o ajenas al dominio', () => {
    const qr = buildQueryRunner(false);
    subscriber.afterInsert(insertEvent(ActionEntity, { id: 'a-1' }, qr));
    subscriber.afterInsert(insertEvent(UserEntity, { id: 'u-1' }, qr));
    expect(realtimeService.notifyEmergency).not.toHaveBeenCalled();
  });

  it('no duplica el mismo evento dentro de una transacción', () => {
    const qr = buildQueryRunner(true);
    const entity = { id: 'a-1', emergency: { id: 'em-1' } };
    subscriber.afterUpdate({ metadata: { target: ActionEntity }, entity, queryRunner: qr } as any);
    subscriber.afterUpdate({ metadata: { target: ActionEntity }, entity, queryRunner: qr } as any);
    subscriber.afterTransactionCommit({ queryRunner: qr } as any);
    expect(realtimeService.notifyEmergency).toHaveBeenCalledTimes(1);
  });
});
