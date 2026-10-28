import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

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

/** `PATCH /resource/:id/amount`: corrige las unidades despachadas (no menos que lo ya devuelto). */
export class CorrectResourceDto {
  @ApiProperty({ example: 4, description: 'Cantidad correcta despachada' })
  @IsInt()
  @Min(1)
  amount: number;
}
