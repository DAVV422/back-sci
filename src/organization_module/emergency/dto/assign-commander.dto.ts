import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignCommanderDto {
  @ApiProperty({
    description: 'ID del usuario a asignar como Comandante de Incidente inicial',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @IsUUID('4', { message: 'El ID del comandante debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del comandante es obligatorio.' })
  commanderUserId: string;
}
