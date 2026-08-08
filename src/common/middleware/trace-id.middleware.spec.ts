import * as uuid from 'uuid';

import { TraceIdMiddleware } from './trace-id.middleware';

describe('TraceIdMiddleware', () => {
  let middleware: TraceIdMiddleware;

  beforeEach(() => {
    middleware = new TraceIdMiddleware();
  });

  it('adds a valid UUID v4 to the request', () => {
    const req: any = {};
    const res: any = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.traceId).toBeDefined();
    expect(uuid.validate(req.traceId)).toBe(true);
    expect(uuid.version(req.traceId)).toBe(4);
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', req.traceId);
    expect(next).toHaveBeenCalled();
  });
});
