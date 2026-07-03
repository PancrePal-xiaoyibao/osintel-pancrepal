// Request-id middleware — assigns a UUID to every request and surfaces it as X-Request-Id.
// All log lines and error responses carry this id so we can trace one request end-to-end.
import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const id = (typeof incoming === 'string' && incoming.length <= 64) ? incoming : randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
