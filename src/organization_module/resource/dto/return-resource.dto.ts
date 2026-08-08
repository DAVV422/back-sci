import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class ReturnResourceDto {
  @ApiProperty({
    example: 3,
    description: 'Cantidad de recurso a devolver al inventario',
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amountReturned: number;
}
