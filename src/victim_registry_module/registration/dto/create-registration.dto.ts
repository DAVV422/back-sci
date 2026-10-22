import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';
import {
  TRANSPORT_MEANS,
  TransportMeans,
} from '../entities/registration.entity';

export class CreateRegistrationDto {
  @ApiProperty({
    description: 'Id de la víctima asociada',
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
  })
  @IsNotEmpty()
  @IsUUID()
  victimId: string;

  @ApiProperty({
    description: 'Clasificación de triage ( START/SALT )',
    enum: ['rojo', 'amarillo', 'verde', 'negro'],
    example: 'amarillo',
  })
  @IsNotEmpty()
  @IsEnum(['rojo', 'amarillo', 'verde', 'negro'])
  classification: 'rojo' | 'amarillo' | 'verde' | 'negro';

  @ApiProperty({
    description:
      'Lugar de traslado (nombre del centro de salud). Si no existe se crea. Va junto con transportMeans.',
    example: 'Hospital de Clínicas',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  transferDestination?: string;

  @ApiProperty({
    description: 'Medio de traslado. Va junto con transferDestination.',
    enum: TRANSPORT_MEANS,
    required: false,
  })
  @IsOptional()
  @IsEnum(TRANSPORT_MEANS)
  transportMeans?: TransportMeans;

  @ApiProperty({
    description: 'Vehículo o unidad de traslado (opcional)',
    example: 'Ambulancia SAMU-02',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150, { message: '$property: máximo $constraint1 caracteres' })
  transferredBy?: string;

  @ApiProperty({
    description: 'Celular del encargado de traslado (opcional)',
    example: '+56912345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: '$property: máximo $constraint1 caracteres' })
  cellphoneTransferManager?: string;

  @ApiProperty({
    description: 'Observaciones médicas / notas (opcional)',
    example: 'Paciente estable con fractura expuesta en pierna izquierda.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '$property: máximo $constraint1 caracteres' })
  notes?: string;

  @ApiProperty({
    description: 'ID generado en offline (opcional)',
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clientGeneratedId?: string;
}
