import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateChargeDto {
  @ApiProperty({
    example: 'Comandante de Incidente',
    type: String,
    description: 'Nombre del cargo',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 5,
    type: Number,
    description: 'Nivel del cargo',
  })
  @IsNotEmpty()
  @IsNumber()
  level: number;

  @ApiProperty({
    example: 75.5,
    type: Number,
    description: 'Peso del cargo',
  })
  @IsNotEmpty()
  @IsNumber()
  weight: number;
}
