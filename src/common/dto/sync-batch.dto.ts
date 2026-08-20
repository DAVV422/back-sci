import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SyncOperationDto {
  @ApiProperty({
    example: 'form207',
    enum: ['form201', 'form207', 'victim', 'registration'],
    description: 'Entidad de la operación',
  })
  @IsNotEmpty()
  @IsEnum(['form201', 'form207', 'victim', 'registration'])
  entity: 'form201' | 'form207' | 'victim' | 'registration';

  @ApiProperty({
    example: 'create',
    enum: ['create', 'update'],
    description: 'Tipo de acción',
  })
  @IsNotEmpty()
  @IsEnum(['create', 'update'])
  action: 'create' | 'update';

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'ID único generado en el cliente móvil/offline',
  })
  @IsNotEmpty()
  @IsUUID()
  clientGeneratedId: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'ID de la emergencia asociada (opcional, requerido para validar cierres)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  emergencyId?: string;

  @ApiProperty({
    example: {},
    description: 'Payload de datos de la entidad',
  })
  @IsNotEmpty()
  @IsObject()
  payload: any;
}

export class SyncBatchDto {
  @ApiProperty({
    type: [SyncOperationDto],
    description: 'Lista ordenada de operaciones offline a sincronizar',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations: SyncOperationDto[];
}

export interface SyncOperationResult {
  clientGeneratedId: string;
  entity: string;
  action: string;
  status: 'success' | 'conflict' | 'error';
  serverId?: string;
  error?: string;
}
