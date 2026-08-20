import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { AuthGuard, RolesGuard } from '../../auth/guards';
import { GetUser } from '../../auth/decorators';
import { NotificationService } from '../services/notification.service';
import { NotificationEntity } from '../entities/notification.entity';
import { DeviceTokenEntity } from '../entities/device-token.entity';
import { RegisterDeviceTokenDto } from '../dto/register-device-token.dto';
import { ApiResponse } from '../../common/interfaces/responseMessage.interface';

@ApiTags('Notification')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current authenticated user' })
  async findMyNotifications(
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<NotificationEntity[]>> {
    const notifications = await this.notificationService.findByUser(userId);
    return {
      success: true,
      statusCode: 200,
      data: notifications,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<NotificationEntity>> {
    const notification = await this.notificationService.markAsRead(id, userId);
    return {
      success: true,
      statusCode: 200,
      message: 'Notificación marcada como leída.',
      data: notification,
    };
  }

  @Post('device-token')
  @ApiOperation({
    summary: 'Registrar o actualizar token FCM del dispositivo del usuario',
  })
  async registerDeviceToken(
    @Body() dto: RegisterDeviceTokenDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<DeviceTokenEntity>> {
    const deviceToken = await this.notificationService.registerDeviceToken(
      userId,
      dto,
    );
    return {
      success: true,
      statusCode: 201,
      message: 'Token de dispositivo registrado exitosamente.',
      data: deviceToken,
    };
  }

  @ApiParam({ name: 'token', type: 'string' })
  @Delete('device-token/:token')
  @ApiOperation({
    summary: 'Eliminar/desactivar un token FCM de dispositivo',
  })
  async removeDeviceToken(
    @Param('token') token: string,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<null>> {
    await this.notificationService.removeDeviceToken(userId, token);
    return {
      success: true,
      statusCode: 200,
      message: 'Token de dispositivo eliminado exitosamente.',
      data: null,
    };
  }
}
