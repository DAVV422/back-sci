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
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationGateway } from '../gateways/notification.gateway';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger('NotificationService');
  private firebaseInitialized = false;

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
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

      // 2. Enviar Push via FCM si Firebase está activo
      this.sendPushNotification(createDto.userId, createDto.title, createDto.message);

      return savedNotification;
    } catch (error) {
      this.logger.error(`Error al enviar notificación: ${error.message}`);
      throw error;
    }
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
  ) {
    if (!this.firebaseInitialized) return;
    try {
      // En una implementación con tokens de dispositivo por usuario, se obtendría el FCM token del usuario.
      // Estructura de envío seguro:
      this.logger.log(`[FCM Push] Preparado para usuario ${userId}: ${title} - ${body}`);
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
