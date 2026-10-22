import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EQUIPMENT_CATEGORIES, EquipmentCategory } from '../equipment-catalog';

export class CreateEquipmentDto {
  @ApiProperty({
    example: 'Excavadora',
    description: 'Nombre del equipo',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100, { message: '$property: máximo $constraint1 caracteres' })
  name: string;

  @ApiProperty({
    example: 'Una excavadora usada para movimientos de tierra.',
    description: 'Descripción del equipo',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 5,
    description: 'Cantidad total de este tipo de equipo',
  })
  @IsNotEmpty()
  @IsNumber()
  totalQuantity: number;

  @ApiProperty({
    example: 3,
    description: 'Cantidad de este tipo de equipo disponible',
  })
  @IsNotEmpty()
  @IsNumber()
  availableQuantity: number;

  @ApiProperty({ enum: EQUIPMENT_CATEGORIES, example: 'extincion', required: false })
  @IsOptional()
  @IsIn(EQUIPMENT_CATEGORIES, { message: 'category: categoría no válida' })
  category?: EquipmentCategory;

  @ApiProperty({ example: false, description: 'Sirve en cualquier emergencia (EPP, radios...)', required: false })
  @IsOptional()
  @IsBoolean()
  generalUse?: boolean;

  @ApiProperty({ example: ['Incendio'], description: 'Tipos de emergencia en los que se usa', required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true, message: 'emergencyTypes: máximo $constraint1 caracteres por tipo' })
  emergencyTypes?: string[];
}
