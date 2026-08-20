import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

import {
  NotificationEntity,
  NotificationType,
} from '../entities/notification.entity';
import { DeviceTokenEntity } from '../entities/device-token.entity';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { NotificationGateway } from '../gateways/notification.gateway';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');
  private firebaseInitialized = false;

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(DeviceTokenEntity)
    private readonly deviceTokenRepository: Repository<DeviceTokenEntity>,
    private readonly notificationGateway: NotificationGateway,
    private readonly userService: UserService,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      if (admin.apps.length > 0) {
        this.firebaseInitialized = true;
        return;
      }
      const firebasePath = path.resolve(process.cwd(), 'firebase-service.json');
      if (fs.existsSync(firebasePath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.firebaseInitialized = true;
        this.logger.log('Firebase Admin SDK inicializado correctamente.');
      } else {
        this.logger.warn(
          'firebase-service.json no encontrado. Canal FCM operará en modo simulado.',
        );
      }
    } catch (error) {
      this.logger.error(`Error al inicializar Firebase: ${error.message}`);
    }
  }

  async registerDeviceToken(
    userId: string,
    dto: RegisterDeviceTokenDto,
  ): Promise<DeviceTokenEntity> {
    const user = await this.userService.findOne(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    let deviceToken = await this.deviceTokenRepository.findOne({
      where: { token: dto.token },
    });

    if (deviceToken) {
      deviceToken.user = user;
      deviceToken.deviceOs = dto.deviceOs || deviceToken.deviceOs;
      deviceToken.isDeleted = false;
    } else {
      deviceToken = this.deviceTokenRepository.create({
        token: dto.token,
        deviceOs: dto.deviceOs || 'android',
        user,
      });
    }

    return await this.deviceTokenRepository.save(deviceToken);
  }

  async removeDeviceToken(userId: string, token: string): Promise<void> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { token, user: { id: userId } },
    });

    if (deviceToken) {
      await this.deviceTokenRepository.update(deviceToken.id, {
        isDeleted: true,
      });
    }
  }

  async sendNotification(
    createDto: CreateNotificationDto,
  ): Promise<NotificationEntity> {
    try {
      const user = await this.userService.findOne(createDto.userId);
      if (!user) throw new NotFoundException('Usuario destinatario no encontrado.');

      const notification = this.notificationRepository.create({
        type: createDto.type,
        title: createDto.title,
        message: createDto.message,
        user,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // 1. Transmitir por WebSocket en tiempo real
      this.notificationGateway.sendToUser(createDto.userId, {
        id: savedNotification.id,
        type: savedNotification.type,
        title: savedNotification.title,
        message: savedNotification.message,
        isRead: savedNotification.isRead,
        createdAt: savedNotification.createdAt,
      });

      // 2. Enviar Push via FCM multicast a los dispositivos registrados
      await this.sendPushNotification(
        createDto.userId,
        savedNotification.id,
        createDto.title,
        createDto.message,
        createDto.type,
      );

      return savedNotification;
    } catch (error) {
      this.logger.error(`Error al enviar notificación: ${error.message}`);
      throw error;
    }
  }

  private async sendPushNotification(
    userId: string,
    notificationId: string,
    title: string,
    body: string,
    type: string,
  ) {
    try {
      const deviceTokens = await this.deviceTokenRepository.find({
        where: { user: { id: userId }, isDeleted: false },
      });

      if (!deviceTokens || deviceTokens.length === 0) {
        this.logger.log(`No hay tokens FCM registrados para el usuario ${userId}`);
        return;
      }

      const tokensList = deviceTokens.map((dt) => dt.token);

      if (!this.firebaseInitialized) {
        this.logger.log(
          `[FCM Push Simulado] Usuario ${userId} (${tokensList.length} dispositivos): ${title} - ${body}`,
        );
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        tokens: tokensList,
        notification: {
          title,
          body,
        },
        data: {
          notificationId,
          type,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `[FCM Push] Éxito: ${response.successCount}, Fallos: ${response.failureCount}`,
      );

      // Depuración de tokens inválidos o expirados
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              tokensToRemove.push(tokensList[idx]);
            }
          }
        });

        if (tokensToRemove.length > 0) {
          await this.deviceTokenRepository
            .createQueryBuilder()
            .update(DeviceTokenEntity)
            .set({ isDeleted: true })
            .where('token IN (:...tokens)', { tokens: tokensToRemove })
            .execute();

          this.logger.log(
            `Se desactivaron ${tokensToRemove.length} FCM tokens inválidos/expirados.`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error al enviar Push FCM: ${error.message}`);
    }
  }

  async findByUser(userId: string): Promise<NotificationEntity[]> {
    return await this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada.');
    }

    if (notification.user.id !== userId) {
      throw new ForbiddenException('No tienes permiso para modificar esta notificación.');
    }

    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }
}
