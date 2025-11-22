import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateEquipmentDto {
  @ApiProperty({
    example: 'Excavadora',
    description: 'Nombre del equipo',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Una excavadora usada para movimientos de tierra.',
    description: 'Descripción del equipo',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: 5,
    description: 'Cantidad total de este tipo de equipo',
  })
  @IsNotEmpty()
  @IsNumber()
  totalQuantity: number;

  @ApiProperty({
    example: 3,
    description: 'Cantidad de este tipo de equipo disponible',
  })
  @IsNotEmpty()
  @IsNumber()
  availableQuantity: number;
}
