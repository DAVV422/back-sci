import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsDateString } from 'class-validator';

export class CreateAttendDto {
  @ApiProperty({
    example: '2024-06-19',
    type: String,
    description: 'Fecha de la asistencia a la emergencia',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'ID del usuario que asistió a la emergencia',
  })
  @IsNotEmpty()
  @IsUUID()
  user: string;

  @ApiProperty({
    example: 'df0647b9-1c9b-4ca6-b5b4-e05a9a62440e',
    type: String,
    description: 'ID de la emergencia a la que se asistió',
  })
  @IsNotEmpty()
  @IsUUID()
  emergency: string;

  @ApiProperty({
    example: 'df0647b9-1c9b-4ca6-b5b4-e05a9a62440e',
    type: String,
    description: 'ID del cargo SCI durante la emergencia a la que se asistió',
  })
  @IsNotEmpty()
  @IsUUID()
  charge: string;
}
