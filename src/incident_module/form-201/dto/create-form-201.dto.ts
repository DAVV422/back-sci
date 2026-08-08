import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsObject,
} from 'class-validator';

export class CreateForm201Dto {
  @ApiProperty({
    example: '2026-08-08',
    description: 'Fecha del formulario',
  })
  @IsNotEmpty()
  @IsDateString()
  date: Date;

  @ApiProperty({
    example: 'Accidente de tránsito múltiple',
    description: 'Naturaleza del incidente',
  })
  @IsNotEmpty()
  @IsString()
  nature: string;

  @ApiProperty({
    example: 'Derrame de combustible y riesgo de explosión',
    description: 'Amenaza(s) asociada(s)',
  })
  @IsNotEmpty()
  @IsString()
  thread: string;

  @ApiProperty({
    example: 'Kilómetro 15 de la autopista principal',
    description: 'Descripción del área afectada',
  })
  @IsNotEmpty()
  @IsString()
  affectedArea: string;

  @ApiProperty({
    example: 'Canal 16 VHF (156.800 MHz)',
    description: 'Frecuencia o canal de comunicación',
  })
  @IsNotEmpty()
  @IsString()
  communicationsChannel: string;

  @ApiProperty({
    example: 'Ruta 5 Sur, carril norte-sur',
    description: 'Ruta de acceso de recursos',
  })
  @IsNotEmpty()
  @IsString()
  entryRoute: string;

  @ApiProperty({
    example: 'Ruta 5 Sur, carril sur-norte (contraflujo)',
    description: 'Ruta de evacuación',
  })
  @IsNotEmpty()
  @IsString()
  egressRoute: string;

  @ApiProperty({
    example: 'https://mapas.sci.gov/incident-102.png',
    description: 'URL del mapa de zonas afectadas',
    required: false,
  })
  @IsOptional()
  @IsString()
  affectedAreasMapUrl?: string;

  @ApiProperty({
    example: '1. Rescatar atrapados. 2. Controlar derrame.',
    description: 'Objetivos',
  })
  @IsNotEmpty()
  @IsString()
  objectives: string;

  @ApiProperty({
    example: 'Uso de espuma química y extricación vehicular.',
    description: 'Estrategias',
  })
  @IsNotEmpty()
  @IsString()
  strategies: string;

  @ApiProperty({
    example: 'Despliegue de Unidad de Rescate R-1.',
    description: 'Tácticas',
  })
  @IsNotEmpty()
  @IsString()
  tactics: string;

  @ApiProperty({
    example: 'Mantener distancia de seguridad del derrame.',
    description: 'Mensaje de seguridad general',
  })
  @IsNotEmpty()
  @IsString()
  safetyMessage: string;

  @ApiProperty({
    example: {},
    description: 'Organigrama manual offline (opcional)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  organizationChart?: Record<string, any>;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'ID generado en offline (opcional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clientGeneratedId?: string;
}
