import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateForm207Dto {
  @ApiProperty({
    description: 'Place of registration',
    example: 'Main Entrance',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: '$property: máximo $constraint1 caracteres' })
  placeOfRegistration: string;

  @ApiProperty({
    description: 'Attendant name',
    example: 'Jane Doe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150, { message: '$property: máximo $constraint1 caracteres' })
  attendant: string;

  @ApiProperty({
    description: 'Date of the form',
    example: '2023-10-27T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  // string ISO: con enableImplicitConversion un tipo Date convertiría el valor
  // antes de validar y @IsDateString() lo rechazaría siempre.
  date: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'ID generado en offline (opcional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  clientGeneratedId?: string;
}
