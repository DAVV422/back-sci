import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'ci_change',
    description: 'Tipo de notificación',
  })
  @IsNotEmpty()
  @IsString()
  type: NotificationType;

  @ApiProperty({
    example: 'Cambio de Comandante del Incidente',
    description: 'Título de la notificación',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Se ha asignado a un nuevo Comandante del Incidente.',
    description: 'Mensaje de la notificación',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'ID del usuario destinatario',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;
}
