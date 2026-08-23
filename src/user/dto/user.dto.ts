import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ROLES } from '../../common/constants';
import { UserEntity } from '../entities/user.entity';

export class UserDTO {
  @ApiProperty({
    example: 'AILAS132-1234',
    type: String,
    description: 'ID del usuario',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

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
    example: '2023-01-01',
    type: Date,
    description: 'Fecha de nacimiento del usuario',
  })
  birthdate?: Date;

  @ApiProperty({
    example: true,
    type: Boolean,
    description: 'Estado del usuario en la institución',
  })
  @IsBoolean()
  isActive: boolean;

  @IsEnum(ROLES)
  role: ROLES;

  public constructor(user: UserEntity) {
    this.id = user.id;
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.cellphone = user.cellphone;
    this.grade = user.grade;
    this.urlImage = user.urlImage;
    this.birthdate = user.birthdate;
    this.isActive = user.isActive;
    this.role = user.role;
  }
}
