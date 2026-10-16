import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'usuario@institucion.bo', description: 'Correo de la cuenta' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(150)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de recuperación enviado por correo' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  token: string;

  @ApiProperty({ example: 'NuevaPassword123!', description: 'Nueva contraseña (mínimo 8 caracteres)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignora lo que pase de 72 bytes
  password: string;
}
