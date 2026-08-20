import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    example: 'fcm_token_sample_string_123456789',
    description: 'Registration Token de FCM generado por el dispositivo móvil',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    example: 'android',
    enum: ['android', 'ios', 'web'],
    description: 'Sistema operativo del dispositivo',
    required: false,
  })
  @IsOptional()
  @IsEnum(['android', 'ios', 'web'])
  deviceOs?: string;
}
