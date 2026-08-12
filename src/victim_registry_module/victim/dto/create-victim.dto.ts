import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVictimDto {
  @ApiProperty({
    description: 'Nombre o código identificador de la víctima (ej. NN-001)',
    example: 'NN-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  identifier?: string;

  @ApiProperty({
    description: 'Edad estimada de la víctima',
    example: 30,
    required: false,
  })
  @IsInt()
  @IsOptional()
  ageEstimated?: number;

  @ApiProperty({
    description: 'Género de la víctima',
    example: 'Masculino',
    required: false,
  })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiProperty({
    description: 'Celular de la víctima',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  cellphone?: string;

  @ApiProperty({
    description: 'Celular del contacto de referencia',
    example: '+0987654321',
    required: false,
  })
  @IsString()
  @IsOptional()
  referenceCellphone?: string;

  @ApiProperty({
    description: 'ID generado en offline (opcional)',
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clientGeneratedId?: string;
}
