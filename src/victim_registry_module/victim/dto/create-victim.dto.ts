import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Length, IsIn } from 'class-validator';

export class CreateVictimDto {
  @ApiProperty({
    description: 'First name of the victim',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Last name of the victim',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    description: 'Gender of the victim (m/f)',
    example: 'm',
    maxLength: 1,
  })
  @IsString()
  @Length(1, 1)
  @IsIn(['m', 'f', 'M', 'F'])
  gender: string;

  @ApiProperty({
    description: 'Age of the victim',
    example: 30,
  })
  @IsInt()
  @IsNotEmpty()
  age: number;

  @ApiProperty({
    description: 'Cellphone number of the victim',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  cellphone: string;

  @ApiProperty({
    description: 'Reference cellphone number',
    example: '+0987654321',
  })
  @IsString()
  @IsNotEmpty()
  reference_cellphone: string;
}
