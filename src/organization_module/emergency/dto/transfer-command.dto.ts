import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class TransferCommandDto {
  @ApiPropertyOptional({
    description: 'ID del usuario que asumirá como nuevo Comandante de Incidente',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @ValidateIf((o) => !o.commanderUserId && !o.userId)
  @IsUUID('4', { message: 'El ID del nuevo comandante debe ser un UUID válido.' })
  newCommanderUserId?: string;

  @ApiPropertyOptional({
    description: 'Alias alternativo de newCommanderUserId',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @ValidateIf((o) => !o.newCommanderUserId && !o.userId)
  @IsUUID('4', { message: 'El ID del nuevo comandante debe ser un UUID válido.' })
  commanderUserId?: string;

  @ApiPropertyOptional({
    description: 'Alias alternativo de newCommanderUserId',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @ValidateIf((o) => !o.newCommanderUserId && !o.commanderUserId)
  @IsUUID('4', { message: 'El ID del nuevo comandante debe ser un UUID válido.' })
  userId?: string;
}
