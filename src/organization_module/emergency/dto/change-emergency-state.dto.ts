import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmergencyStatus } from '../enums/emergency-status.enum';

export class ChangeEmergencyStateDto {
  @ApiProperty({
    enum: EmergencyStatus,
    description: 'Nuevo estado de la emergencia',
  })
  @IsNotEmpty()
  @IsEnum(EmergencyStatus)
  state: EmergencyStatus;

  @ApiProperty({
    example: 'Falso reporte',
    type: String,
    description:
      'Motivo de cancelación (obligatorio para cancelar la emergencia)',
  })
  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
