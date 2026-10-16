import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { emergencyRoom } from '../realtime/realtime-events';
import { verifyAccessToken } from '../../common/utils/user.token';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('NotificationGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Cliente ${client.id} rechazado: Token no provisto.`);
        client.disconnect();
        return;
      }

      // Misma verificación que el AuthGuard: firma, expiración y que no sea un refresh token.
      const verified = verifyAccessToken(token, this.configService.get<string>('JWT_AUTH') || undefined);
      if (typeof verified === 'string') {
        this.logger.warn(`Cliente ${client.id} rechazado: ${verified}`);
        client.disconnect();
        return;
      }
      const userId = verified.sub;

      client.data.userId = userId;
      client.join(`user_${userId}`);
      this.logger.log(`Cliente ${client.id} conectado y unido a la sala user_${userId}`);
    } catch (error) {
      this.logger.error(`Error de autenticación WebSocket: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente ${client.id} desconectado.`);
  }

  @SubscribeMessage('join_emergency')
  handleJoinEmergency(
    @ConnectedSocket() client: Socket,
    @MessageBody() emergencyId: string,
  ) {
    if (emergencyId) {
      client.join(emergencyRoom(emergencyId));
      this.logger.log(`Cliente ${client.id} se unió a la sala ${emergencyRoom(emergencyId)}`);
      return { event: 'joined_emergency', data: emergencyId };
    }
  }

  @SubscribeMessage('leave_emergency')
  handleLeaveEmergency(
    @ConnectedSocket() client: Socket,
    @MessageBody() emergencyId: string,
  ) {
    if (emergencyId) {
      client.leave(emergencyRoom(emergencyId));
      this.logger.log(`Cliente ${client.id} salió de la sala ${emergencyRoom(emergencyId)}`);
      return { event: 'left_emergency', data: emergencyId };
    }
  }

  sendToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  sendToEmergency(emergencyId: string, notification: any) {
    this.server.to(emergencyRoom(emergencyId)).emit('emergency_notification', notification);
  }

  emitToEmergency(emergencyId: string, event: string, payload: unknown) {
    this.server?.to(emergencyRoom(emergencyId)).emit(event, payload);
  }

  broadcast(event: string, payload: unknown) {
    this.server?.emit(event, payload);
  }
}
