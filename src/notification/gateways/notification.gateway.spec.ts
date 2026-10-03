import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { NotificationGateway } from './notification.gateway';

describe('NotificationGateway', () => {
  const SECRET = 'auth-secret';
  let gateway: NotificationGateway;
  let jwtService: JwtService;

  const buildClient = (token?: string) =>
    ({
      id: 'socket-1',
      handshake: { auth: { token }, headers: {} },
      data: {} as Record<string, unknown>,
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
    } as any);

  beforeEach(() => {
    jwtService = new JwtService({});
    const configService = {
      get: jest.fn((key: string) => (key === 'JWT_AUTH' ? SECRET : undefined)),
    } as unknown as ConfigService;
    gateway = new NotificationGateway(jwtService, configService);
  });

  it('acepta un token firmado con JWT_AUTH y une al cliente a su sala personal', async () => {
    const token = jwtService.sign({ sub: 'user-1' }, { secret: SECRET });
    const client = buildClient(token);

    await gateway.handleConnection(client);

    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data.userId).toBe('user-1');
    expect(client.join).toHaveBeenCalledWith('user_user-1');
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const token = jwtService.sign({ sub: 'user-1' }, { secret: 'otro' });
    const client = buildClient(token);
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('rechaza la conexión sin token', async () => {
    const client = buildClient();
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('join_emergency y leave_emergency usan la sala emergency_{id}', () => {
    const client = buildClient();
    gateway.handleJoinEmergency(client, 'em-1');
    expect(client.join).toHaveBeenCalledWith('emergency_em-1');
    gateway.handleLeaveEmergency(client, 'em-1');
    expect(client.leave).toHaveBeenCalledWith('emergency_em-1');
  });
});
