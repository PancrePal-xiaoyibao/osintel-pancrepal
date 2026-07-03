// Global error handler + asyncHandler wrapper.
//
// asyncHandler lets async route handlers throw without wrapping every body in try/catch —
// rejected promises are forwarded to next(), which hits the 4-arg error middleware.
//
// The error middleware logs the failure with pino (stack at error level) and returns a
// consistent JSON envelope. 5xx responses never leak the raw message (caller might be hostile).
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from '../logger.ts';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  expose?: boolean; // when true, the message is safe to return to the client even on 4xx
}

export const asyncHandler = <T extends (...args: any[]) => any>(fn: T) =>
  (req: any, res: any, next: any): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const reqId = (req as any).id || 'unknown';
  const status = err.status || err.statusCode || 500;
  const isClientError = status < 500;
  const expose = (err as AppError).expose === true || isClientError;

  if (isClientError) {
    logger.warn({ reqId, path: req.path, method: req.method, status, err: err.message }, 'client_error');
  } else {
    logger.error({ reqId, path: req.path, method: req.method, status, err: err.message, stack: err.stack }, 'server_error');
  }

  if (res.headersSent) return;

  res.status(status).json({
    status: 'error',
    mode: status >= 500 ? 'unavailable' : 'graceful_fallback',
    reason: expose ? (err.message || 'request_failed') : 'internal_error',
    code: (err as AppError).code,
    requestId: reqId
  });
};

// 404 fallback for unmatched /api/* routes
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    mode: 'unavailable',
    reason: 'not_found',
    path: req.path,
    requestId: (req as any).id || 'unknown'
  });
};
