import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ROLES } from '../../common/constants';

export class CreateUserDto {
  @ApiProperty({
    example: 'John',
    type: String,
    description: 'Nombre del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'Doe',
    type: String,
    description: 'Apellido del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  lastName: string;

  @ApiProperty({
    example: 'john@live.com',
    type: String,
    description: 'Correo electrónico del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    type: String,
    description: 'Contraseña inicial del usuario (opcional; si no se provee se genera una aleatoria)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({
    example: '67303349',
    type: String,
    description: 'Número de celular del usuario',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  cellphone?: string;

  @ApiProperty({
    example: 'Capitán',
    type: String,
    description: 'Grado Jerárquico del usuario',
  })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({
    example:
      'https://scontent.fsrz1-1.fna.fbcdn.net/v/t39.30808-6/321514687_828263794936611_9117207435075792485_n.jpg',
    type: String,
    description: 'Url de la imagen de foto de perfil',
  })
  @IsOptional()
  @IsString()
  urlImage?: string;

  @ApiProperty({
    example: '2000-04-18',
    type: String,
    description: 'Fecha de Nacimiento del usuario',
  })
  @IsOptional()
  birthdate?: Date;

  @ApiProperty({
    example: 'admin',
    enum: ROLES,
    description: 'Rol del usuario',
  })
  @IsNotEmpty()
  @IsEnum(ROLES)
  role: ROLES;
}
