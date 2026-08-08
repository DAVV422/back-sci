import { ApiResponse } from '../interfaces/responseMessage.interface';

export const responseHandler = <T>(
  responseOptions: ApiResponse<T>,
): ApiResponse<T> => {
  const { message, statusCode = 500, data, meta } = responseOptions;
  const response: ApiResponse<T> = {
    success: true,
    message,
    statusCode,
    data,
    meta,
  };
  return response;
};
