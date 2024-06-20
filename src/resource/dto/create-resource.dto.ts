import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateResourceDto {
  @ApiProperty({
    example: 'Good',
    description: 'Initial state of the resource',
  })
  @IsNotEmpty()
  @IsString()
  state_initial: string;

  @ApiProperty({
    example: 'Damaged',
    description: 'End state of the resource',
  })
  @IsNotEmpty()
  @IsString()
  state_end: string;

  @ApiProperty({
    example: '2024-06-20',
    description: 'Date of the resource usage',
  })
  @IsNotEmpty()
  @IsDateString()
  date: Date;

  @ApiProperty({
    example: '14:30',
    description: 'Hour of the resource usage',
  })
  @IsNotEmpty()
  @IsString()
  hour: string;

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
