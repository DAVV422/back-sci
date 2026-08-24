import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ActivateAccountDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Token de activación enviado por correo',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NuevaPassword123!',
    description: 'Nueva contraseña elegida por el usuario',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
