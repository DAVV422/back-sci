import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDataFireDto {
  @ApiProperty({
    example: 25.5,
    type: Number,
    description: 'Temperatura ambiente en grados Celsius',
  })
  @IsNotEmpty()
  @IsNumber()
  temperature: number;

  @ApiProperty({
    example: 60.2,
    type: Number,
    description: 'Humedad relativa en porcentaje',
  })
  @IsNotEmpty()
  @IsNumber()
  relative_humidity: number;

  @ApiProperty({
    example: 15.7,
    type: Number,
    description: 'Velocidad del viento en km/h',
  })
  @IsNotEmpty()
  @IsNumber()
  wind_speed: number;

  @ApiProperty({
    example: 'Falla eléctrica',
    type: String,
    description: 'Causa de la emergencia',
  })
  @IsNotEmpty()
  @IsString()
  cause: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'Id de la emergencia a la que pertencerá',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  emergency: string;
}
