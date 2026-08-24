import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ResendActivationDto {
  @ApiProperty({
    example: 'usuario@sci.local',
    description: 'Correo electrónico del usuario inactivo',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;
}
