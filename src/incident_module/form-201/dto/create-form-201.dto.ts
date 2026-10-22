import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateForm201Dto {
  @ApiProperty({
    example: '2026-08-08',
    description: 'Fecha del formulario',
  })
  @IsNotEmpty()
  @IsDateString()
  // string ISO: con enableImplicitConversion un tipo Date convertiría el valor
  // antes de validar y @IsDateString() lo rechazaría siempre.
  date: string;

  @ApiProperty({
    example: '2026-08-08T14:30:00.000Z',
    description:
      'Casilla 2: fecha y hora de preparación, en UTC. Por defecto, la de creación.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  preparedAt?: string;

  @ApiProperty({
    example: 'Accidente de tránsito múltiple',
    description: 'Naturaleza del incidente',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150, { message: '$property: máximo $constraint1 caracteres' })
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
  @MaxLength(255, { message: '$property: máximo $constraint1 caracteres' })
  affectedArea: string;

  @ApiProperty({
    example: 'Canal 16 VHF (156.800 MHz)',
    description: 'Frecuencia o canal de comunicación',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100, { message: '$property: máximo $constraint1 caracteres' })
  communicationsChannel: string;

  @ApiProperty({
    example: 'Ruta 5 Sur, carril norte-sur',
    description: 'Ruta de acceso de recursos',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255, { message: '$property: máximo $constraint1 caracteres' })
  entryRoute: string;

  @ApiProperty({
    example: 'Ruta 5 Sur, carril sur-norte (contraflujo)',
    description: 'Ruta de evacuación',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255, { message: '$property: máximo $constraint1 caracteres' })
  egressRoute: string;

  @ApiProperty({
    example: 'https://mapas.sci.gov/incident-102.png',
    description: 'URL del mapa de zonas afectadas',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '$property: máximo $constraint1 caracteres' })
  affectedAreasMapUrl?: string;

  @ApiProperty({
    description:
      'Mapa de situación (casilla 12): { perimeter: [{lat,lng}], elements: [{id, symbol, lat, lng, label?}] }. null lo borra.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  situationMap?: unknown;

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
  @MaxLength(500, { message: '$property: máximo $constraint1 caracteres' })
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
