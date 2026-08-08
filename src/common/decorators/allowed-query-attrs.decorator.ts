import { BadRequestException } from '@nestjs/common';

import { QueryDto } from '../dto/query.dto';

export const USER_ALLOWED_ATTRS = [
  'name',
  'email',
  'is_active',
  'role',
  'last_name',
] as const;

export const EMERGENCY_ALLOWED_ATTRS = [
  'name',
  'state',
  'type',
  'date',
  'code',
] as const;

/**
 * Valida que `attr` pertenezca a la whitelist de atributos permitidos de la
 * entidad consultada antes de interpolarse en el QueryBuilder.
 *
 * Previene inyección SQL vía el parámetro dinámico `attr` de `QueryDto`.
 */
export const validateAllowedAttrs = (
  attr: string | undefined,
  allowedAttrs: readonly string[],
): void => {
  if (attr && !allowedAttrs.includes(attr)) {
    throw new BadRequestException('Atributo de búsqueda no permitido.');
  }
};

/**
 * Decorador de método reutilizable para validar el `attr` del `QueryDto`
 * recibido como primer argumento contra una whitelist de atributos.
 */
export const AllowedQueryAttrs =
  (allowedAttrs: readonly string[]) =>
  (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => any>,
  ) => {
    const originalMethod = descriptor.value;
    descriptor.value = function (this: unknown, ...args: any[]) {
      const queryDto = args[0] as QueryDto | undefined;
      if (queryDto) validateAllowedAttrs(queryDto.attr, allowedAttrs);
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
