import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateChargeDto {
  @ApiProperty({
    example: 'Comandante de Incidente',
    type: String,
    description: 'Nombre del cargo',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'CI',
    type: String,
    description: 'Abreviatura estándar del cargo en el SCI (ej. CI, JOP, etc.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  abbreviation?: string;

  @ApiProperty({
    example: 5,
    type: Number,
    description: 'Nivel del cargo',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @ApiProperty({
    example: 75.5,
    type: Number,
    description: 'Peso del cargo',
  })
  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  weight: number;

  @ApiPropertyOptional({
    example: 'incident_commander',
    type: String,
    description:
      'Identificador programático del cargo (ej. incident_commander). Único entre cargos que lo definen.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'systemName solo admite minúsculas, números y guion bajo.' })
  systemName?: string;
}
