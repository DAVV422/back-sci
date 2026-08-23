import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateChargeDto {
  @ApiProperty({
    example: 'Comandante de Incidente',
    type: String,
    description: 'Nombre del cargo',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'CI',
    type: String,
    description: 'Abreviatura estándar del cargo en el SCI (ej. CI, JOP, etc.)',
  })
  @IsOptional()
  @IsString()
  abbreviation?: string;

  @ApiProperty({
    example: 5,
    type: Number,
    description: 'Nivel del cargo',
  })
  @IsNotEmpty()
  @IsNumber()
  level: number;

  @ApiProperty({
    example: 75.5,
    type: Number,
    description: 'Peso del cargo',
  })
  @IsNotEmpty()
  @IsNumber()
  weight: number;

  @ApiPropertyOptional({
    example: 'incident_commander',
    type: String,
    description:
      'Identificador programático del cargo (ej. incident_commander). Único entre cargos que lo definen.',
  })
  @IsOptional()
  @IsString()
  systemName?: string;
}
