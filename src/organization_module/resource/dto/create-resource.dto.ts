import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    example: 10,
    description: 'Amount of the resource',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: 'Resource used for emergency response.',
    description: 'Notes about the resource usage',
    required: false,
  })
  @IsString()
  note?: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'Id of the emergency associated with the resource',
  })
  @IsNotEmpty()
  @IsUUID()
  emergencyId: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'Id of the equipment associated with the resource',
  })
  @IsNotEmpty()
  @IsUUID()
  equipmentId: string;
}
