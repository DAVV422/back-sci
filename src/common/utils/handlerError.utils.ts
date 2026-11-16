import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

/**
 * Nombres legibles de las columnas que aparecen en los errores de la base. Sirven para decirle a la
 * persona *qué* dato está repetido o falta, sin devolverle el mensaje crudo de PostgreSQL.
 */
const CAMPOS: Record<string, string> = {
  email: 'correo electrónico',
  name: 'nombre',
  last_name: 'apellido',
  code: 'código',
  cellphone: 'celular',
  system_name: 'nombre de sistema',
  short_name: 'sigla',
  user_id: 'usuario',
  emergency_id: 'emergencia',
  charge_id: 'cargo',
  equipment_id: 'equipo',
  vehicle_id: 'vehículo',
};

const legible = (columna: string): string =>
  CAMPOS[columna] ?? columna.replace(/_/g, ' ');

/**
 * Saca del `detail` de PostgreSQL **solo los nombres de columna**, nunca los valores. El detalle
 * llega como `Key (email)=(juan@ejemplo.com) already exists.`: devolver eso tal cual mostraba el
 * dato de otra persona y los nombres internos del esquema.
 */
const camposDe = (detalle?: string): string | null => {
  const encontrado = /^Key \(([^)]+)\)=/i.exec(detalle ?? '');
  if (!encontrado) return null;
  return encontrado[1]
    .split(',')
    .map((columna) => legible(columna.trim()))
    .join(' y ');
};

/** Mensaje en español por código de PostgreSQL. Ninguno incluye valores de la base. */
const mensajeDeBaseDeDatos = (error: any): HttpException | null => {
  const campos = camposDe(error?.detail);

  switch (error?.code) {
    case '23505': // unique_violation
      return new ConflictException(
        campos
          ? `Ya existe un registro con ese ${campos}.`
          : 'Ya existe un registro con esos datos.',
      );
    case '23503': // foreign_key_violation
      return new BadRequestException(
        'El registro al que se hace referencia no existe, o no se puede eliminar porque está en uso.',
      );
    case '23502': // not_null_violation
      return new BadRequestException(
        error?.column
          ? `Falta un dato obligatorio: ${legible(error.column)}.`
          : 'Falta un dato obligatorio.',
      );
    case '22P02': // invalid_text_representation
      return new BadRequestException('Alguno de los datos enviados tiene un formato no válido.');
    case '23514': // check_violation
      return new BadRequestException('Alguno de los datos enviados no cumple una regla de validación.');
    case '22001': // string_data_right_truncation
      return new BadRequestException('Alguno de los textos enviados es más largo de lo permitido.');
    case '42601': // syntax_error
      return new BadRequestException('La consulta solicitada no es válida.');
    default:
      return null;
  }
};

export const handlerError = (error: any, logger: Logger): any => {
  if (error instanceof HttpException) {
    logger.warn(`[HandlerError] Excepción controlada: ${error.message} (${error.getStatus()})`);
    throw error;
  }

  // El detalle crudo queda en el registro del servidor, donde sí hace falta para diagnosticar,
  // pero no viaja al cliente.
  logger.error(
    `[HandlerError] Error no controlado: ${error?.message || error}` +
      (error?.code ? ` | code=${error.code}` : '') +
      (error?.detail ? ` | detail=${error.detail}` : '') +
      (error?.constraint ? ` | constraint=${error.constraint}` : ''),
    error?.stack,
  );

  const deBase = mensajeDeBaseDeDatos(error);
  if (deBase) throw deBase;

  if (error?.type === 'Not Found') throw new NotFoundException('No se encontró el recurso solicitado.');
  if (error?.status === 404) throw new NotFoundException('No se encontró el recurso solicitado.');
  if (error?.status === 400) throw new BadRequestException('La solicitud no es válida.');

  throw new InternalServerErrorException('Error interno del servidor.');
};
