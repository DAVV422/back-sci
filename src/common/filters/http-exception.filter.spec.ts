import { BadRequestException, NotFoundException } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  const buildMockHost = (request: Record<string, unknown> = {}) => {
    const req = {
      url: '/api/test',
      method: 'GET',
      traceId: 'trace-123',
      ...request,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      __response: res,
    };
  };

  const getBody = (host: any) => {
    const response = host.__response;
    return response.json.mock.calls[0][0];
  };

  it('formats a BadRequestException as ApiErrorResponse with statusCode 400', () => {
    const host: any = buildMockHost();
    filter.catch(new BadRequestException('Bad request'), host);

    const response = host.__response;
    expect(response.status).toHaveBeenCalledWith(400);
    const body = getBody(host);
    expect(body).toEqual({
      success: false,
      statusCode: 400,
      message: 'Bad request',
      error: 'Bad Request',
      timestamp: expect.any(String),
      path: '/api/test',
      traceId: 'trace-123',
    });
  });

  it('formats a NotFoundException as ApiErrorResponse with statusCode 404', () => {
    const host: any = buildMockHost();
    filter.catch(new NotFoundException('Not found'), host);

    const response = host.__response;
    expect(response.status).toHaveBeenCalledWith(404);
    const body = getBody(host);
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('Not found');
    expect(body.error).toBe('Not Found');
    expect(body.traceId).toBe('trace-123');
  });

  it('formats a generic exception as ApiErrorResponse with statusCode 500 and traceId', () => {
    const host: any = buildMockHost();
    filter.catch(new Error('Something broke'), host);

    const response = host.__response;
    expect(response.status).toHaveBeenCalledWith(500);
    const body = getBody(host);
    expect(body).toMatchObject({
      success: false,
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
      traceId: 'trace-123',
      path: '/api/test',
    });
    expect(typeof body.timestamp).toBe('string');
  });
});
