import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEmergencyDto {
  @ApiProperty({
    example: 'Incendio en el edificio A',
    type: String,
    description: 'Nombre de la emergencia',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100, { message: '$property: máximo $constraint1 caracteres' })
  name: string;

  @ApiProperty({
    example: 'Segundo piso, sector norte',
    type: String,
    description: 'Descripción de la ubicación de la emergencia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '$property: máximo $constraint1 caracteres' })
  location_description?: string;

  @ApiProperty({
    example: '2024-06-19',
    type: String,
    description: 'Fecha de la emergencia',
  })
  @IsNotEmpty()
  date: Date;

  @ApiProperty({
    example: '14:30',
    type: String,
    description: 'Hora de la emergencia',
  })
  @IsNotEmpty()
  @IsString()
  hour: string;

  @ApiProperty({
    example: 'Incendio',
    type: String,
    description: 'Tipo de emergencia',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50, { message: '$property: máximo $constraint1 caracteres' })
  type: string;

  @ApiProperty({
    example: [-68.15, -16.5],
    type: [Number],
    description: 'Coordenadas de la emergencia (latitud y longitud)',
  })
  @IsOptional()
  @IsArray()
  coordinates?: number[];

  @ApiProperty({
    example: [-68.15, -16.5],
    type: [Number],
    description: 'Coordenadas del área de espera (latitud y longitud)',
  })
  @IsOptional()
  @IsArray()
  coordinates_e?: number[];

  @ApiProperty({
    example: [-68.15, -16.5],
    type: [Number],
    description: 'Coordenadas del puesto comando (latitud y longitud)',
  })
  @IsOptional()
  @IsArray()
  coordinates_pc?: number[];

  @ApiProperty({
    example: '2 horas',
    type: String,
    description: 'Duración de la emergencia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '$property: máximo $constraint1 caracteres' })
  duration?: string;
}
