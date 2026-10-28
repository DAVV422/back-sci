import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { VEHICLE_STATUSES, VehicleStatus } from '../entities/vehicle.entity';

const MAX = { message: '$property: máximo $constraint1 caracteres' };

export class VehicleLoadItemDto {
  @ApiProperty({ example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356' })
  @IsUUID()
  equipmentId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

/** `POST /vehicle` (Manager o superior). */
export class CreateVehicleDto {
  @ApiProperty({ example: 'AB-3', description: 'Código operativo del vehículo' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20, MAX)
  code: string;

  @ApiProperty({ example: 'Autobomba' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50, MAX)
  vehicleType: string;

  @ApiProperty({ example: '2345-ABC', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20, MAX)
  plate?: string;

  @ApiProperty({ enum: VEHICLE_STATUSES, required: false })
  @IsOptional()
  @IsIn(VEHICLE_STATUSES)
  status?: VehicleStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255, MAX)
  notes?: string;

  @ApiProperty({ type: [VehicleLoadItemDto], required: false, description: 'Carga estándar (equipo a bordo)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => VehicleLoadItemDto)
  load?: VehicleLoadItemDto[];
}

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

export class DispatchVehicleItemDto {
  @ApiProperty({ example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356' })
  @IsUUID()
  equipmentId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  amount: number;
}

/**
 * `POST /emergency/:emergencyId/vehicle`: despacha un vehículo con el equipo que lleva. `items`
 * parte de su carga estándar, pero se puede ajustar (lo que hoy no lleva, o algo de más).
 */
export class DispatchVehicleDto {
  @ApiProperty({ example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ type: [DispatchVehicleItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DispatchVehicleItemDto)
  items: DispatchVehicleItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200, MAX)
  note?: string;
}

/** `POST /vehicle-dispatch/:id/items`: más equipo a bordo de un vehículo que sigue en la emergencia. */
export class AddVehicleItemsDto {
  @ApiProperty({ type: [DispatchVehicleItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DispatchVehicleItemDto)
  items: DispatchVehicleItemDto[];
}

export class ReturnVehicleItemDto {
  @ApiProperty({ example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  amountReturned: number;
}

/**
 * `PATCH /vehicle-dispatch/:id/return`: el vehículo vuelve con su equipo. Sin `items` vuelve todo;
 * con `items` se indica cuánto vuelve de cada equipo (lo que no, queda pendiente en la emergencia).
 */
export class ReturnVehicleDto {
  @ApiProperty({ type: [ReturnVehicleItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReturnVehicleItemDto)
  items?: ReturnVehicleItemDto[];
}
