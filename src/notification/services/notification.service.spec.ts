import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationEntity } from '../entities/notification.entity';
import { DeviceTokenEntity } from '../entities/device-token.entity';
import { NotificationGateway } from '../gateways/notification.gateway';
import { UserService } from '../../user/services/user.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: any;
  let update: any;

  beforeEach(async () => {
    update = { set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({ affected: 3 }) };
    repo = {
      create: jest.fn((d: any) => d),
      save: jest.fn(async (d: any) => ({ id: 'n-1', isRead: false, createdAt: new Date(), ...d })),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({ update: jest.fn().mockReturnValue(update) })),
    };
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationEntity), useValue: repo },
        { provide: getRepositoryToken(DeviceTokenEntity), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: NotificationGateway, useValue: { sendToUser: jest.fn() } },
        { provide: UserService, useValue: { findOne: jest.fn(async (id: string) => ({ id })) } },
      ],
    }).compile();
    service = module.get(NotificationService);
  });

  it('notifyUsers no repite destinatarios ni avisa a quien hizo la acción', async () => {
    const send = jest.spyOn(service, 'sendNotification').mockResolvedValue({} as any);
    service.notifyUsers(['u-1', 'u-2', 'u-1', null, 'actor'], { type: 'emergency_state_change', title: 't', message: 'm', emergencyId: 'e-1' }, 'actor');
    expect(send.mock.calls.map(([dto]) => dto.userId)).toEqual(['u-1', 'u-2']);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ emergencyId: 'e-1' }));
  });

  it('notifyUsers nunca lanza aunque falle el envío', async () => {
    jest.spyOn(service, 'sendNotification').mockRejectedValue(new Error('caído'));
    expect(() => service.notifyUsers(['u-1'], { type: 'assignment', title: 't', message: 'm' })).not.toThrow();
    await new Promise((r) => setImmediate(r));
  });

  it('guarda la emergencia de la notificación y lista las últimas 100 con ella', async () => {
    await service.sendNotification({ userId: 'u-1', type: 'assignment', title: 't', message: 'm', emergencyId: 'e-1' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ emergency: { id: 'e-1' } }));
    await service.findByUser('u-1');
    expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({ relations: ['emergency'], take: 100 }));
  });

  it('marca todas como leídas solo las del usuario', async () => {
    await expect(service.markAllAsRead('u-1')).resolves.toBe(3);
    expect(update.where).toHaveBeenCalledWith('user_id = :userId AND is_read = false', { userId: 'u-1' });
  });
});
