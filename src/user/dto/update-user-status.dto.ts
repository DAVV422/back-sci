import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: false,
    type: Boolean,
    description: 'Nuevo estado de actividad del usuario',
  })
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;
}
