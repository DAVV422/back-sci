import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferCommandDto {
  @ApiProperty({
    description: 'ID del usuario que asumirá como nuevo Comandante de Incidente',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @IsUUID('4', { message: 'El ID del nuevo comandante debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del nuevo comandante es obligatorio.' })
  newCommanderUserId: string;
}
