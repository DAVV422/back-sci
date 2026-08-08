import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ApiErrorResponse } from '../interfaces/responseMessage.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { traceId?: string }>();

    const traceId = request.traceId;

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error', error: 'Internal Server Error' };

    const message = this.extractMessage(exceptionResponse, statusCode);
    const error = this.extractError(exceptionResponse, statusCode);

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      traceId,
    };

    this.logger.error(
      `[${traceId}] ${request.method} ${
        request.url
      } - ${statusCode} - ${JSON.stringify(message)}`,
    );

    response.status(statusCode).json(body);
  }

  private extractMessage(
    exceptionResponse: unknown,
    statusCode: number,
  ): string | string[] {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      !Array.isArray(exceptionResponse)
    ) {
      const res = exceptionResponse as Record<string, unknown>;
      if (res.message !== undefined) return res.message as string | string[];
    }
    return HttpStatus[statusCode] || 'Internal server error';
  }

  private extractError(exceptionResponse: unknown, statusCode: number): string {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      !Array.isArray(exceptionResponse)
    ) {
      const res = exceptionResponse as Record<string, unknown>;
      if (typeof res.error === 'string') return res.error;
    }
    return HttpStatus[statusCode] || 'Internal Server Error';
  }
}
