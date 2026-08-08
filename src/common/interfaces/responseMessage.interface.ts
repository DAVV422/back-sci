export interface ApiResponseMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message?: string;
  data: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  traceId: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
