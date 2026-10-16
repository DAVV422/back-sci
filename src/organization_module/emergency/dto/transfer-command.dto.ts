import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { TRANSFER_BRIEFING_ITEMS, TRANSFER_BRIEFING_KEYS } from '../transfer-briefing';

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

  @ApiProperty({
    description: `Temas de la lista de transferencia del manual que el CI saliente confirma haber cubierto. Deben estar todos: ${JSON.stringify(TRANSFER_BRIEFING_ITEMS)}`,
    example: TRANSFER_BRIEFING_KEYS,
  })
  @IsArray()
  @ArrayMaxSize(TRANSFER_BRIEFING_KEYS.length)
  @IsIn(TRANSFER_BRIEFING_KEYS, { each: true, message: 'Tema de la lista de transferencia desconocido.' })
  briefing: string[];

  @ApiPropertyOptional({ description: 'Observaciones de la entrega (pendientes, advertencias)', example: 'Queda pendiente el relevo de la cuadrilla 2 a las 18:00.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
