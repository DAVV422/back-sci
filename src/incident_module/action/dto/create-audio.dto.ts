import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAudioDto {
  @ApiProperty({
    example: 'data/audios/01b9bbf4.../02b9bbf4.../audio_1724112000.m4a',
    description: 'Ruta local o relativa del archivo de audio almacenado',
  })
  @IsNotEmpty()
  @IsString()
  pathAudio: string;

  @ApiPropertyOptional({
    example: 12.5,
    description: 'Duración del audio en segundos',
  })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Indica si ya fue procesado por el pipeline de NLP',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  processed?: boolean;

  @ApiPropertyOptional({
    example: 'audio_1724112000.m4a',
    description: 'Nombre del archivo generado',
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    example: 'audio/m4a',
    description: 'Formato MIME del archivo',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    example: 524288,
    description: 'Tamaño en bytes del archivo',
  })
  @IsOptional()
  @IsNumber()
  sizeBytes?: number;

  @ApiPropertyOptional({
    example: 'Se requiere ambulancia en sector sur por 2 lesionados leves.',
    description: 'Texto transcrito por el motor Speech-to-Text / Whisper',
  })
  @IsOptional()
  @IsString()
  transcription?: string;

  @ApiPropertyOptional({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    description: 'Identificador único offline generado en el cliente móvil',
  })
  @IsOptional()
  @IsUUID()
  clientGeneratedId?: string;
}
