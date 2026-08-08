import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = uuidv4();
    (req as Request & { traceId?: string }).traceId = traceId;
    res.setHeader('X-Trace-Id', traceId);
    next();
  }
}
