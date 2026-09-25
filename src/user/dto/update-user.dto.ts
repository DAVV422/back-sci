import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ROLES } from '../../common/constants';

export class UpdateUserDto {
  @ApiProperty({
    example: 'john@live.com',
    type: String,
    description: 'Correo electrónico del usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'admin',
    enum: ROLES,
    description: 'Rol institucional del usuario',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(ROLES)
  role?: ROLES;

  @ApiProperty({
    example: true,
    type: Boolean,
    description: 'Estado de la cuenta (activo / inactivo para acceder al sistema)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: true,
    type: Boolean,
    description: 'Disponibilidad operativa en emergencias (en servicio / fuera de servicio)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isOperational?: boolean;

  @ApiProperty({
    example: 'Capitán',
    type: String,
    description: 'Grado o jerarquía institucional del personal de emergencia',
    required: false,
  })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiProperty({
    example: 'NuevaPassword123*',
    type: String,
    description: 'Nueva contraseña del usuario',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

