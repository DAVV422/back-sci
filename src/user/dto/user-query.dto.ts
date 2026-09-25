import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { QueryDto } from '../../common/dto/query.dto';
import { ROLES } from '../../common/constants';

export class UserQueryDto extends QueryDto {
  @ApiPropertyOptional({
    description:
      'Búsqueda global por texto (busca coincidencias parciales simultáneamente en nombre, apellido y correo)',
    example: 'juan',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El parámetro search debe ser un texto' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtro específico por nombre de pila (coincidencia parcial)',
    example: 'Juan',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El parámetro name debe ser un texto' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Filtro específico por apellido (coincidencia parcial)',
    example: 'Pérez',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El parámetro lastName debe ser un texto' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Filtro específico por correo electrónico (coincidencia parcial)',
    example: 'juan@sci.local',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El parámetro email debe ser un texto' })
  email?: string;

  @ApiPropertyOptional({
    enum: ROLES,
    description:
      'Filtro exacto por rol institucional (suadmin, admin, manager, advanced, basic)',
    example: 'admin',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? (value.toLowerCase() as ROLES) : value,
  )
  @IsEnum(ROLES, {
    message: 'role debe ser uno de los roles válidos: suadmin, admin, manager, advanced, basic',
  })
  role?: ROLES;

  @ApiPropertyOptional({
    description: 'Filtro específico por grado institucional (coincidencia parcial)',
    example: 'Capitán',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El parámetro grade debe ser un texto' })
  grade?: string;

  @ApiPropertyOptional({
    description:
      'Filtro por estado de cuenta en plataforma (true = activo para login, false = inactivo/suspendido)',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean({ message: 'isActive debe ser un booleano (true o false)' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Filtro por disponibilidad operativa de guardia (true = en servicio/guardia activa, false = fuera de servicio)',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean({ message: 'isOperational debe ser un booleano (true o false)' })
  isOperational?: boolean;
}
