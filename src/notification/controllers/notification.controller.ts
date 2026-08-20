import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { AuthGuard, RolesGuard } from '../../auth/guards';
import { GetUser } from '../../auth/decorators';
import { NotificationService } from '../services/notification.service';
import { NotificationEntity } from '../entities/notification.entity';
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
}
