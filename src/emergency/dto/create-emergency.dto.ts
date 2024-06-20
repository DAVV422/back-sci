import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEmergencyDto {
  @ApiProperty({
    example: 'Incendio en el edificio A',
    type: String,
    description: 'Nombre de la emergencia',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Segundo piso, sector norte',
    type: String,
    description: 'Descripción de la ubicación de la emergencia',
  })
  @IsOptional()
  @IsString()
  locationDescription?: string;

  @ApiProperty({
    example: '2024-06-19',
    type: String,
    description: 'Fecha de la emergencia',
  })
  @IsNotEmpty()
  @IsString()
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
  type: string;

  @ApiProperty({
    example: [ -68.150000, -16.500000 ],
    type: [Number],
    description: 'Coordenadas de la emergencia (latitud y longitud)',
  })
  @IsOptional()
  @IsArray()
  coordinates?: number[];

  @ApiProperty({
    example: 'en curso',
    type: String,
    description: 'Estado de la emergencia',
  })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({
    example: '2 horas',
    type: String,
    description: 'Duración de la emergencia',
  })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'Id del usuario que creo la emergencia',
  })
  @IsNotEmpty()
  @IsUUID()
  user: string;
}
