import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserGradeItemDto {
  @ApiProperty({
    description: 'UUID del usuario a actualizar',
    example: 'd3b07384-d113-494e-9c8e-aa8939b4e12e',
  })
  @IsNotEmpty({ message: 'El userId es obligatorio en cada elemento' })
  @IsUUID('4', { message: 'El userId debe ser un UUID v4 válido' })
  userId: string;

  @ApiProperty({
    description: 'Grado institucional a asignar a este usuario específico',
    example: 'Teniente Primero',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El grado debe ser una cadena de texto' })
  grade?: string;
}

export class BulkUpdateGradeDto {
  @ApiProperty({
    description:
      'Grado institucional global para asignar a todos los usuarios indicados en userIds',
    example: 'Bombero Primero',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El grado global debe ser una cadena de texto' })
  grade?: string;

  @ApiProperty({
    description:
      'Lista de IDs de usuarios a los que se les asignará el grado global',
    example: [
      'd3b07384-d113-494e-9c8e-aa8939b4e12e',
      'a1c07384-d113-494e-9c8e-aa8939b4e12f',
    ],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'userIds debe ser un arreglo de UUIDs' })
  @IsUUID('4', { each: true, message: 'Cada elemento de userIds debe ser un UUID v4 válido' })
  userIds?: string[];

  @ApiProperty({
    description:
      'Lista de usuarios con grados específicos individualizados por usuario',
    type: [UserGradeItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'users debe ser un arreglo de objetos UserGradeItemDto' })
  @ValidateNested({ each: true })
  @Type(() => UserGradeItemDto)
  users?: UserGradeItemDto[];
}
