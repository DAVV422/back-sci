import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateForm201Dto {
  @ApiProperty({
    example: 'Objetivo de la form 201',
    description: 'Objetivo de la form 201',
  })  
  @IsString()
  objective: string;

  @ApiProperty({
    example: 'Estrategia de la form 201',
    description: 'Estrategia de la form 201',
  })  
  @IsString()
  strategy: string;

  @ApiProperty({
    example: 'Mensaje de seguridad de la form 201',
    description: 'Mensaje de seguridad de la form 201',
  })  
  @IsString()
  safety_message: string;

  @ApiProperty({
    example: 'https://example.com/organization_chart.png',
    description: 'URL del organigrama de la organización',
    default: '',
  })
  @IsString()
  url_organization_chart?: string;

  @ApiProperty({
    example: 'Hilo de discusión relacionado con la form 201',
    description: 'Hilo de discusión relacionado con la form 201',
    default: '',
  })
  @IsString()
  thread?: string;

  @ApiProperty({
    example: 'Medidas de aislamiento de la form 201',
    description: 'Medidas de aislamiento de la form 201',
    default: '',
  })
  @IsString()
  isolation?: string;

  @ApiProperty({
    example: 'Áreas afectadas de la form 201',
    description: 'Áreas afectadas de la form 201',
    default: '',
  })
  @IsString()
  affected_areas?: string;

  @ApiProperty({
    example: 'Tácticas de la form 201',
    description: 'Tácticas de la form 201',
  })  
  @IsString()
  tactics: string;

  @ApiProperty({
    example: 'Ruta de salida de la form 201',
    description: 'Ruta de salida de la form 201',
    default: '',
  })
  @IsString()
  egress_route?: string;

  @ApiProperty({
    example: 'Ruta de entrada de la form 201',
    description: 'Ruta de entrada de la form 201',
    default: '',
  })
  @IsString()
  entry_route?: string;

  @ApiProperty({
    example: 'Áreas afectadas por el evento de la form 201',
    description: 'Áreas afectadas por el evento de la form 201',
    default: '',
  })
  @IsString()
  affected_areasM?: string;

  @ApiProperty({
    example: '2024-06-20',
    description: 'Fecha de la form 201',
  })
  @IsNotEmpty()  
  date: Date;

  @ApiProperty({
    example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
    type: String,
    description: 'Id de la emergencia a la que pertencerá',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  emergency: string;
}
