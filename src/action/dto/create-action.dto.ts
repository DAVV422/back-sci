import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateActionDto {
  @ApiProperty({
    example: 'Descripción de la acción',
    description: 'Descripción de la acción',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: '2024-06-20',
    description: 'Fecha de la acción',
  })
  @IsNotEmpty()
  date: Date;

  @ApiProperty({
    example: '14:30',
    description: 'Hora de la acción',
  })
  @IsNotEmpty()
  @IsString()
  hour: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'Id del formulario al que se asociará',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  form201: string;
}
