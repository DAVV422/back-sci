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
  lastName?: string;

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
    example: '1995-05-20',
    type: String,
    description: 'Fecha de nacimiento del usuario',
    required: false,
  })
  @IsOptional()
  birthdate?: Date;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    type: String,
    description: 'URL de la imagen de perfil',
    required: false,
  })
  @IsOptional()
  @IsString()
  urlImage?: string;
}

