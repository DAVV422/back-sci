import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const MAX = { message: '$property: máximo $constraint1 caracteres' };

/** `PATCH /api/institution` (Admin o superior). */
export class UpdateInstitutionDto {
  @ApiProperty({ example: 'Fundación Rescate Urbano', required: false })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'name: mínimo $constraint1 caracteres' })
  @MaxLength(120, MAX)
  name?: string;

  @ApiProperty({ example: 'FRU', required: false, description: 'Sigla; vacío para quitarla' })
  @IsOptional()
  @IsString()
  @MaxLength(40, MAX)
  shortName?: string;
}
