import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateAudioDto } from './create-audio.dto';

export class CreateActionDto {
  @ApiProperty({
    example: 'Descripción de la acción u observación de campo',
    description: 'Descripción de la acción',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: '2026-08-20',
    description: 'Fecha de la acción',
  })
  @IsNotEmpty()
  date: Date;

  @ApiProperty({
    example: '14:30',
    description: 'Hora de la acción',
  })
  @IsNotEmpty()
  @IsString()
  hour: string;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'ID de la emergencia a la que se asociará',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  emergency: string;

  @ApiPropertyOptional({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'Identificador único offline generado en el cliente móvil',
  })
  @IsOptional()
  @IsUUID()
  clientGeneratedId?: string;

  @ApiPropertyOptional({
    type: CreateAudioDto,
    description: 'Metadatos opcionales del audio adjunto a la acción',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAudioDto)
  audio?: CreateAudioDto;
}
