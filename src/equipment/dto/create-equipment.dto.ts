import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsOptional, IsUrl } from 'class-validator';

export class CreateEquipmentDto {
  @ApiProperty({
    example: 'Excavadora',
    description: 'Nombre del equipo',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Construcción',
    description: 'Utilización del equipo',
  })
  @IsNotEmpty()
  @IsString()
  utilization: string;

  @ApiProperty({
    example: 'Una excavadora usada para movimientos de tierra.',
    description: 'Descripción del equipo',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '2023-06-20',
    description: 'Fecha de adquisición del equipo',
  })
  @IsNotEmpty()
  acquisitionDate: Date;

  @ApiProperty({
    example: 'Nuevo',
    description: 'Estado del equipo al momento de la adquisición',
  })
  @IsNotEmpty()
  @IsString()
  stateAcquisition: string;

  @ApiProperty({
    example: 'Bueno',
    description: 'Estado actual del equipo',
  })
  @IsNotEmpty()
  @IsString()
  stateActual: string;

  @ApiProperty({
    example: 'https://example.com/photo.jpg',
    description: 'URL de la foto del equipo',
  })
  @IsOptional()
  @IsUrl()
  urlPhoto?: string;
}
