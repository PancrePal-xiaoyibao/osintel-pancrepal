// JWT sign/verify — 15min access token. Refresh tokens (7d) deferred until reverse-proxy
// session-cookie story lands; the SPA stores the access token in localStorage and refreshes
// by re-running /api/auth/login. JWT_SECRET must be set in production (refuse to boot otherwise).
import jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  uid: string;
  username: string;
  role: 'user' | 'admin';
}

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';

function resolveSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production (use a 32+ char random string).');
    }
    // Dev/test fallback — clearly marked so it can never accidentally leak to prod.
    return 'dev-only-insecure-secret-DO-NOT-USE-IN-PRODUCTION';
  }
  if (secret.length < 16) {
    throw new Error('JWT_SECRET too short (need >= 16 chars).');
  }
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, resolveSecret(), { expiresIn: ACCESS_TTL } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, resolveSecret()) as AccessTokenPayload;
  if (!decoded.uid || !decoded.username || !decoded.role) {
    throw new Error('invalid_token_payload');
  }
  return decoded;
}

export function decodeAccessTokenUnsafely(token: string): AccessTokenPayload | null {
  try {
    return jwt.decode(token) as AccessTokenPayload;
  } catch {
    return null;
  }
}
