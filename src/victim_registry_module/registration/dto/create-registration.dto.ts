import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';

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
    description: 'Vehículo o unidad de traslado (opcional)',
    example: 'Ambulancia SAMU-02',
    required: false,
  })
  @IsString()
  @IsOptional()
  transferredBy?: string;

  @ApiProperty({
    description: 'Celular del encargado de traslado (opcional)',
    example: '+56912345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  cellphoneTransferManager?: string;

  @ApiProperty({
    description: 'Observaciones médicas / notas (opcional)',
    example: 'Paciente estable con fractura expuesta en pierna izquierda.',
    required: false,
  })
  @IsString()
  @IsOptional()
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
