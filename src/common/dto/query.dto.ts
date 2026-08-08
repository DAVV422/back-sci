import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive, IsString, Min } from 'class-validator';

import { ORDER, ORDER_ENUM } from '../constants';

/**
 * Uso seguro del campo `attr`:
 * Nunca interpolar `attr` directamente en un QueryBuilder sin antes validarlo
 * contra la whitelist de atributos permitidos de la entidad consultada. Usar
 * `validateAllowedAttrs(attr, ALLOWED_ATTRS)` o el decorador `AllowedQueryAttrs`
 * de `src/common/decorators/allowed-query-attrs.decorator.ts`.
 */
export class QueryDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number) // enableImplicitConversions: true
  limit?: number;

  @IsOptional()
  @Min(0)
  @Type(() => Number) // enableImplicitConversions: true
  offset?: number;

  @IsOptional()
  @IsEnum(ORDER_ENUM)
  order?: ORDER;

  @IsString()
  @IsOptional()
  attr: string;

  @IsOptional()
  value: string;
}
