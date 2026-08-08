import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateAttendDto {
  @ApiProperty({
    example: 'df0647b9-1c9b-4ca6-b5b4-e05a9a62440e',
    type: String,
    description: 'ID del nuevo cargo SCI asignado al personal',
  })
  @IsNotEmpty()
  @IsUUID()
  chargeId: string;
}
