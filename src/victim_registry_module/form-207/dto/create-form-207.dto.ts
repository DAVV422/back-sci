import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateForm207Dto {
  @ApiProperty({
    description: 'Place of registration',
    example: 'Main Entrance',
  })
  @IsString()
  @IsOptional()
  placeOfRegistration: string;

  @ApiProperty({
    description: 'Attendant name',
    example: 'Jane Doe',
  })
  @IsString()
  @IsNotEmpty()
  attendant: string;

  @ApiProperty({
    description: 'Date of the form',
    example: '2023-10-27T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'ID generado en offline (opcional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clientGeneratedId?: string;
}
