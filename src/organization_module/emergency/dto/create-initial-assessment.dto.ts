import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { SeverityLevel } from '../enums/severity-level.enum';

export class CreateInitialAssessmentDto {
  @ApiProperty({
    example: 'Derrame de combustible',
    type: String,
    description: 'Tipo de peligro identificado',
  })
  @IsNotEmpty()
  @IsString()
  hazard_type: string;

  @ApiProperty({
    example: 'Accidente de tránsito',
    type: String,
    description: 'Naturaleza del incidente',
  })
  @IsOptional()
  @IsString()
  nature_of_incident?: string;

  @ApiProperty({
    example: 'Riesgo de explosión, humo tóxico',
    type: String,
    description: 'Amenazas identificadas',
  })
  @IsOptional()
  @IsString()
  threats?: string;

  @ApiProperty({
    example: 'Carril norte de la vía',
    type: String,
    description: 'Área afectada',
  })
  @IsOptional()
  @IsString()
  affected_area?: string;

  @ApiProperty({
    example: 'Perímetro de 100 metros',
    type: String,
    description: 'Aislamiento',
  })
  @IsOptional()
  @IsString()
  isolation?: string;

  @ApiProperty({
    example: 'Alto',
    enum: SeverityLevel,
    description: 'Nivel de severidad',
  })
  @IsNotEmpty()
  @IsEnum(SeverityLevel)
  severity_level: SeverityLevel;

  @ApiProperty({
    example: 25,
    type: Number,
    description: 'Estimación inicial de personas afectadas',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  affected_people_estimated?: number;

  @ApiProperty({
    example: 'Dos vehículos involucrados, dos personas atrapadas',
    type: String,
    description: 'Descripción detallada de la situación',
  })
  @IsNotEmpty()
  @IsString()
  situation_description: string;

  @ApiProperty({
    example: 'Viento moderado, lluvia leve',
    type: String,
    description: 'Condiciones del clima (viento, lluvia, visibilidad)',
  })
  @IsOptional()
  @IsString()
  weather_conditions?: string;
}
