import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { IsPassword, PASSWORD_RULE_TEXT } from '../../common/validators/password.validator';

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

  @ApiProperty({ example: 'NuevaPassword123!', description: `Nueva contraseña. ${PASSWORD_RULE_TEXT}` })
  @IsNotEmpty()
  @IsPassword()
  password: string;
}
