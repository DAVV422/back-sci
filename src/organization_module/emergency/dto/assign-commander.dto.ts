import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class AssignCommanderDto {
  @ApiPropertyOptional({
    description: 'ID del usuario a asignar como Comandante de Incidente inicial',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @ValidateIf((o) => !o.userId)
  @IsUUID('4', { message: 'El ID del comandante debe ser un UUID válido.' })
  commanderUserId?: string;

  @ApiPropertyOptional({
    description: 'Alias alternativo de commanderUserId para mayor compatibilidad con Frontend',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @ValidateIf((o) => !o.commanderUserId)
  @IsUUID('4', { message: 'El ID del comandante debe ser un UUID válido.' })
  userId?: string;
}
