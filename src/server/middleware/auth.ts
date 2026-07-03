// Auth middleware — `requireAuth` verifies a Bearer JWT and attaches `req.user`.
// `requireRole('admin')` layers an authorization check on top.
//
// Strategy notes:
// - We pull the token from the Authorization header (not cookies) so the same backend serves
//   the static SPA, the API, and any future CLI/mobile client without CSRF surface.
// - On missing/expired token we return 401 with a machine-readable `reason`. The frontend can
//   redirect to login; a hostile client gets nothing useful.
import type { RequestHandler } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../auth/jwt.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenPayload;
  }
}

function extractBearer(req: any): string | null {
  const header = req.headers?.authorization;
  if (typeof header !== 'string') return null;
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = extractBearer(req);
  if (!token) {
    return res.status(401).json({
      status: 'error',
      mode: 'unavailable',
      reason: 'no_token',
      code: 'no_token',
      requestId: (req as any).id || 'unknown'
    });
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err: any) {
    const reason = err?.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token';
    return res.status(401).json({
      status: 'error',
      mode: 'unavailable',
      reason,
      code: reason,
      requestId: (req as any).id || 'unknown'
    });
  }
};

export function requireRole(role: 'user' | 'admin'): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        mode: 'unavailable',
        reason: 'no_token',
        code: 'no_token',
        requestId: (req as any).id || 'unknown'
      });
    }
    if (req.user.role !== role && role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        mode: 'unavailable',
        reason: 'forbidden',
        code: 'forbidden',
        requestId: (req as any).id || 'unknown'
      });
    }
    next();
  };
}
