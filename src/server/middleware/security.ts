// HTTP security middleware — helmet + cors(whitelist) + compression + body-size limit +
// three rate limiters (global, auth, llm). All knobs env-driven so production can tighten.
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import type { RequestHandler } from 'express';

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const helmetMiddleware: RequestHandler = helmet({
  // Vite injects inline scripts/styles in dev; the reverse proxy (T5) owns CSP in prod.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

const corsMiddleware: RequestHandler = cors({
  origin(origin, cb) {
    // Allow same-origin / curl / server-side (no Origin header) by default.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`origin_not_allowed:${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
});

const compressionMiddleware: RequestHandler = compression();

// Global limiter — generous default for read-heavy APIs.
export const globalRateLimit: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '300', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', mode: 'unavailable', reason: 'rate_limited', code: 'rate_limited' }
});

// Auth limiter — tight to slow credential brute-force and registration flooding.
export const authRateLimit: RequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', mode: 'unavailable', reason: 'too_many_auth_attempts', code: 'auth_rate_limited' }
});

// LLM limiter — caps anonymous LLM-proxy abuse (financial protection).
export const llmRateLimit: RequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: parseInt(process.env.RATE_LIMIT_LLM_MAX || '20', 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 'error', mode: 'unavailable', reason: 'llm_rate_limited', code: 'llm_rate_limited' }
});

export const coreSecurityMiddleware: RequestHandler[] = [
  helmetMiddleware,
  corsMiddleware,
  compressionMiddleware,
  globalRateLimit
];

export { ALLOWED_ORIGINS };
