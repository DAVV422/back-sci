import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

export const handlerError = (error: any, logger: Logger): any => {
  if (error instanceof HttpException) {
    logger.warn(`[HandlerError] Excepción controlada: ${error.message} (${error.getStatus()})`);
    throw error;
  }

  logger.error(
    `[HandlerError] Error no controlado: ${error?.message || error}`,
    error?.stack,
  );

  if (error.type === 'Not Found') throw new NotFoundException(error.detail);
  if (error.code === '23503') throw new BadRequestException(error.detail);
  if (error.code === '23505') throw new BadRequestException(error.detail);
  if (error.code === '23502') throw new BadRequestException(error.detail);
  if (error.code === '22P02') throw new BadRequestException(error.detail);
  if (error.code === '23514') throw new BadRequestException(error.detail);
  if (error.code === '42601')
    throw new BadRequestException('Campo attribute(attr) no válido.');
  if (error.status === 404) throw new NotFoundException(error.response);
  if (error.status === 400) throw new BadRequestException(error.response);

  throw new InternalServerErrorException('Internal Server Error');
};
