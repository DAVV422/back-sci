import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, } from 'class-validator';

import { ROLES } from '../../common/constants';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    type: String,
    description: 'Nombre del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'John Doe',
    type: String,
    description: 'Apellido del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  last_name: string;

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
    example: '67303349',
    type: String,
    description: 'Numero de celular del usuario',
  })  
  @IsString()  
  @MinLength(8)
  cellphone?: string;

  @ApiProperty({
    example: 'Capitán',
    type: String,
    description: 'Grado Jerárquico del usuario',
  })  
  @IsString()    
  grade?: string;

  @ApiProperty({
    example: '2000-04-18',
    type: String,
    description: 'Fecha de Nacimiento del usuario',
  })  
  @IsString()  
  birthdate?: string;

  @ApiProperty({
    example: '123456',
    type: String,
    description: 'Contraseña del usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'admin',
    enum: ROLES,
    description: 'Rol del usuario',
  })  
  @IsString()
  @IsEnum(ROLES)
  role?: ROLES;
}
