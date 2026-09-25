import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: true,
    type: Boolean,
    description: 'Nuevo estado de disponibilidad operativa en emergencias (en servicio / fuera de servicio)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;

  @ApiProperty({
    example: true,
    type: Boolean,
    description: 'Compatibilidad legacy con isActive (se mapea a isOperational en este endpoint)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

