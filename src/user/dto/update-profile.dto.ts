import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'John',
    type: String,
    description: 'Nombre del usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiProperty({
    example: 'Doe',
    type: String,
    description: 'Apellido del usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  last_name?: string;

  @ApiProperty({
    example: '67303349',
    type: String,
    description: 'Número de celular del usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  cellphone?: string;

  @ApiProperty({
    example: 'Capitán',
    type: String,
    description: 'Grado Jerárquico del usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  grade?: string;
}
