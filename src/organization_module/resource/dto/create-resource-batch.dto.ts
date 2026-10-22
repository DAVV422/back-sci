import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DispatchItemDto {
  @ApiProperty({ example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356' })
  @IsUUID()
  equipmentId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  amount: number;
}

/** `POST /resource/batch`: varios equipos sueltos a una emergencia en una sola operación. */
export class CreateResourceBatchDto {
  @ApiProperty({ example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356' })
  @IsNotEmpty()
  @IsUUID()
  emergencyId: string;

  @ApiProperty({ type: [DispatchItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DispatchItemDto)
  items: DispatchItemDto[];

  @ApiProperty({ example: 'Equipo de Intervención 1 - Sector Bravo', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '$property: máximo $constraint1 caracteres' })
  note?: string;
}
