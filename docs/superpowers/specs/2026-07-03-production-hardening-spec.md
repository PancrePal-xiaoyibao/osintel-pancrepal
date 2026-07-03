# Production Hardening Spec (生产硬化技术规范)

> Status: APPROVED · Author: 浮浮酱 · Date: 2026-07-03
> Parent: [#3](https://github.com/PancrePal-xiaoyibao/osintel-pancrepal/issues/3)
> Prereq: [#10 Mock audit](https://github.com/PancrePal-xiaoyibao/osintel-pancrepal/issues/10) — CLOSED
> Audit: [2026-07-03-production-hardening-audit.md](../../process/2026-07-03-production-hardening-audit.md)
> Branch: `feat/production-hardening`

## 1. Background

After the mock-audit (#10) closed production-trust gaps, three parallel deep audits
(backend 40/100, frontend 58/100, devops 38/100) surfaced a compounded critical risk:

> **An anonymous visitor can read every patient's cancer-mutation profile and burn the
> operator's LLM budget**, because: (a) no auth middleware on any route, (b) plaintext
> passwords + unsigned base64 token, (c) no rate-limit on the LLM proxy endpoints, (d) PHI
> stored in-memory and in plaintext LocalStorage, (e) `/api/osint/chat-custom` is an open SSRF
> (client-controlled `baseUrl`). Medical + financial dual risk — must close before any public exposure.

This spec defines the **P0 production hardening pass** (Tasks T1-T7) that closes the hard
launch blockers and gives the project a real deployment + ops story.

## 2. Goals

After this PR:

- Every `/api/*` route is behind helmet + cors + rate-limit + global error handler + structured logger.
- Auth uses bcrypt-hashed passwords + signed short-TTL JWT; sensitive routes require auth.
- The LLM gateway has a provider-domain whitelist + RFC1918/loopback/metadata-IP reject.
- All runtime state survives restart (SQLite-backed `osint_items`, `resource_centers`, `users`).
- The app ships in a Docker container with `HEALTHCHECK` and SIGTERM handling.
- A GitHub Actions CI runs lint+test+build+audit on every PR.
- The frontend has a global `ErrorBoundary`, cleans up SSE on unmount, shows a `seed-only` banner
  in static deploy, and labels all `demo_only` surfaces clearly.

## 3. Non-Goals (deferred to later PRs)

- Modularizing `server.ts` into routes/ (T9 — high value but non-blocking; lands next).
- Frontend PII scrubbing + `react-markdown` renderer (T10).
- Plain-language mode + glossary (T11, issue #7).
- Pancreatic center contribution UI (T12, issue #9).
- Video integration (T13, issue #8).
- Search filters + RSS (T14, issue #6).
- PHI field-level encryption with KMS (T15 — depends on T4 first).
- Data-source ToS audit (T16).

## 4. Decision Record (ADR)

- **Stay single-process Express.** A multi-service split is premature; the bottleneck is
  engineering rigor, not architecture. We add production primitives to the existing process.
- **SQLite over Postgres for v1.** Zero-ops deploy (one file), node-native via
  `better-sqlite3`, synchronous API matches the current request-handler pattern. Supabase
  migrations exist in `supabase/` but were never wired up; we keep them as the future-cloud
  schema and use SQLite as the local-default implementation.
- **JWT over session cookies for v1.** Stateless token fits the SPA + static-deploy model.
  Cookies can come later when we add a reverse proxy with CSRF tokens.
- **bcryptjs (pure JS) over bcrypt (native).** Cross-platform npm install without
  `node-gyp`; the ~5x perf cost is irrelevant at our user count.
- **pino over winston.** Faster, JSON-first, simpler API, smaller surface area.
- **Docker multi-stage build.** Small final image (~150 MB), `node:22-alpine` runtime,
  non-root user, `HEALTHCHECK` calling `/healthz`.
- **GitHub Actions matrix: Node 18 + 22.** Existing quickstart documents both.

## 5. Architecture (target)

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (React SPA)                                              │
│  └─ ErrorBoundary (T7) wraps <App/>                              │
│  └─ Auth token in localStorage (signed JWT, 15min/7d)            │
│  └─ SSE cleanup on unmount (T7)                                  │
└─────────────────────────────────────────────────────────────────┘
              │  HTTPS (terminates at reverse proxy in T5)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Express server (single process)                                  │
│  Middleware pipeline (T1):                                       │
│   requestId → helmet → cors(whitelist) → express.json(1mb)       │
│   → rateLimit(global 100/15min) → rateLimit(auth 5/min)          │
│   → pino-http logger                                             │
│  Auth (T2):                                                      │
│   authMiddleware (verify JWT) on /manual-ingest /rollback        │
│                              /chat-custom /personal/translate     │
│   localUsers persisted in SQLite (bcrypt hash)                   │
│  Gateway (T3):                                                   │
│   validateProviderBaseUrl() — whitelist 7 known provider hosts   │
│   rejectPrivateIp() — RFC1918/loopback/link-local/169.254        │
│  Persistence (T4):                                               │
│   data/app.db (SQLite) — osint_items / resource_centers / users  │
│                                  / auth_audit / event_log         │
│   startup: loadFromFile warm-up + first refresh                  │
│  Health (T1):                                                    │
│   /healthz (liveness) — process alive                            │
│   /readyz (readiness) — DB ping + disk space + at-least-1-source │
│   /api/ops/status — full ops snapshot                            │
│  Global error handler (T1): 4-arg middleware, pino + 500 JSON    │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│ External (real upstreams, unchanged):                            │
│  KnowS · Europe PMC · CT.gov · AnySearch · Tavily · Serper ·     │
│  Brave · Exa · Semantic Scholar · OpenAlex · Google CSE · Metaso │
│  LLM gateway (7 whitelisted providers) · Gemini                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Detailed implementation

Each task below has: scope, files touched, key snippets, verification, rollback.

### T1 — HTTP security middleware + global error handler + structured logging

**Audit refs**: BE-C1, BE-C4, OPS-M1
**Effort**: 1 day
**Files**:
- `server.ts` (top, before any route)
- new `src/server/middleware/security.ts`
- new `src/server/middleware/error.ts`
- new `src/server/middleware/request-id.ts`
- new `src/server/logger.ts`
- `src/lib/health-check.ts` (extend with real pings)
- `package.json` (+ helmet, cors, express-rate-limit, compression, pino, pino-http, pino-pretty, @sentry/node optional)
- `tests/security-middleware.test.mjs`

**Key code**:

```typescript
// src/server/logger.ts
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.apiKey', '*.password'],
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
});
```

```typescript
// src/server/middleware/security.ts
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',').map(s => s.trim());

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: false, // Vite injects inline; CSP comes via reverse proxy
    crossOriginEmbedderPolicy: false,
  }),
  cors({ origin: ALLOWED_ORIGINS, credentials: true }),
  compression(),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }),
];

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, max: 5, message: { status: 'error', reason: 'too_many_auth_attempts' }
});

export const llmRateLimit = rateLimit({
  windowMs: 60 * 1000, max: 20, message: { status: 'error', reason: 'llm_rate_limited' }
});
```

```typescript
// src/server/middleware/error.ts
import type { ErrorRequestHandler } from 'express';
import { logger } from '../logger';

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const reqId = (req as any).id || 'unknown';
  const status = err.status || (err.statusCode) || 500;
  logger.error({ reqId, err: err.message, stack: err.stack, path: req.path }, 'unhandled_error');
  if (res.headersSent) return;
  res.status(status).json({
    status: 'error',
    mode: status >= 500 ? 'unavailable' : 'graceful_fallback',
    reason: status >= 500 ? 'internal_error' : (err.message || 'bad_request'),
    requestId: reqId
  });
};

// asyncHandler — wraps async routes so rejections hit the error middleware
export const asyncHandler = <T extends (...a: any[]) => any>(fn: T) =>
  (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
```

**Verification**:
```bash
npm run lint
npm run build
node tests/security-middleware.test.mjs  # asserts helmet headers, CORS, 429 on flood, 500 format
curl -i http://localhost:3000/api/health   # expect helmet headers present
```

**Rollback**: revert the middleware `app.use(...)` calls; routes return to naked state.

### T2 — Real auth: bcrypt + signed JWT + auth middleware

**Audit refs**: BE-C2, OPS-C1
**Effort**: 1-2 days
**Files**:
- `src/server/auth/password.ts` (bcrypt hash/verify)
- `src/server/auth/jwt.ts` (sign/verify, 15min access + 7d refresh)
- `src/server/middleware/auth.ts` (`requireAuth`, optional `requireRole`)
- `server.ts` (rewrite `/api/auth/login`, `/api/auth/register`; apply middleware)
- `data/app.db` schema: `users(username PK, password_hash, role, created_at, last_login)`
- `tests/auth.test.mjs`

**Key code**:

```typescript
// src/server/auth/jwt.ts
import jwt from 'jsonwebtoken';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'dev-only-secret-DO-NOT-USE-IN-PROD';
})();

export function signAccessToken(payload: { uid: string; role: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_TTL });
}
export function verifyAccessToken(token: string) {
  return jwt.verify(token, SECRET) as { uid: string; role: string };
}
```

```typescript
// src/server/middleware/auth.ts
import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../auth/jwt';

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ status: 'error', reason: 'no_token' });
  try {
    (req as any).user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ status: 'error', reason: 'invalid_or_expired_token' });
  }
};
```

**Apply to sensitive routes**: `/api/osint/manual-ingest`, `/api/osint/rollback`,
`/api/osint/chat-custom`, `/api/personal/translate`.

**Migration**:
- On first start, if `JWT_SECRET` env var is unset and prod mode, refuse to boot.
- Existing in-memory `localUsers` (plaintext) → if `.env DEFAULT_USERNAME/DEFAULT_PASSWORD`
  set, create the row with bcrypt hash on first boot (one-shot, logged).
- The default `admin/pancreas123` is **kept for local dev only**; production deploy must set
  `DEFAULT_PASSWORD` to something strong or disable default-account creation via `ALLOW_DEFAULT_ACCOUNT=0`.

**Verification**:
```bash
node tests/auth.test.mjs   # register → bcrypt hash in DB; login → JWT; protected route without token → 401
curl -X POST localhost:3000/api/osint/manual-ingest -d '{}' -H 'Content-Type: application/json'  # → 401
```

**Rollback**: revert to plaintext Map; restore base64 token. **Do not** — the rollback is unsafe.

### T3 — SSRF protection + LLM gateway whitelist

**Audit refs**: BE-C5, BE-M10
**Effort**: 0.5 day
**Files**:
- `src/server/security/ssrf-guard.ts`
- `server.ts` `/api/osint/chat-custom` (apply guard)
- `tests/ssrf-guard.test.mjs`

**Key code**:

```typescript
// src/server/security/ssrf-guard.ts
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const ALLOWED_LLM_HOSTS = new Set([
  'api.siliconflow.cn', 'dashscope.aliyuncs.com', 'openrouter.ai',
  'generativelanguage.googleapis.com', 'api.openai.com', 'api.fireworks.ai',
  'api.stepfun.com'
]);

function isPrivateIp(ip: string): boolean {
  if (ip === '0.0.0.0' || ip === '::') return true;
  // loopback, private, link-local, metadata
  return net.isLoopback(ip) || ip.startsWith('10.') || ip.startsWith('192.168.')
    || ip.startsWith('169.254.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80');
}

export async function assertSafeProviderUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`disallowed_protocol:${url.protocol}`);
  }
  if (!ALLOWED_LLM_HOSTS.has(url.hostname)) {
    // Allow custom provider only if explicitly enabled + not private IP
    if (process.env.ALLOW_CUSTOM_LLM_HOST !== '1') {
      throw new Error(`provider_not_whitelisted:${url.hostname}`);
    }
  }
  // DNS-lookup the host and reject private/loopback/metadata IPs (DNS-rebinding defense)
  const records = await lookup(url.hostname, { all: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error(`private_ip_resolved:${r.address}`);
    }
  }
  return url;
}
```

Apply to `/api/osint/chat-custom`: `const safeUrl = await assertSafeProviderUrl(req.body.config.baseUrl);`

**Response hygiene**: never echo `endpointUrl`/`baseUrl` back in the `reasoning` field.

**Verification**:
```bash
node tests/ssrf-guard.test.mjs   # private IP rejected, unknown host rejected, known host OK
```

**Rollback**: remove the guard call. **Do not** — SSRF is a launch blocker.

### T4 — Persistence layer (SQLite)

**Audit refs**: BE-C3, OPS-M2
**Effort**: 1-2 days
**Files**:
- new `src/server/db/index.ts` (better-sqlite3 connection + schema bootstrap)
- new `src/server/db/repositories/{osint-items,resource-centers,users,event-log}.ts`
- `server.ts` (replace `let osintFeed = ...` etc. with repo-backed accessors)
- `data/.gitignore` (already covered by `data/` in root .gitignore)
- `Dockerfile` (volume mount `/app/data`)
- `tests/persistence.test.mjs`

**Schema** (`data/app.db`, auto-created on first boot):

```sql
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS osint_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  published_at TEXT,
  category TEXT,
  evidence_level TEXT,
  importance_score REAL,
  summary TEXT,
  raw_json TEXT,            -- full OSINTItem JSON for fields we don't model
  ingested_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_osint_ingested ON osint_items(ingested_at DESC);

CREATE TABLE IF NOT EXISTS resource_centers (
  id TEXT PRIMARY KEY,
  name TEXT, country TEXT, latitude REAL, longitude REAL,
  explicit_category TEXT, raw_json TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  level TEXT NOT NULL,
  source TEXT,
  message TEXT,
  meta_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_event_ts ON event_log(ts DESC);
```

**Key behavior**:
- `osintFeed` now reads `SELECT ... FROM osint_items ORDER BY ingested_at DESC LIMIT 300`.
- After `refreshNewsFeed`, upsert new items (drop duplicates by `id`).
- `errorLog` (watchdog demo) replaced with `event_log` query, capped at 1000 rows via
  periodic cleanup (`DELETE WHERE id NOT IN (SELECT id FROM event_log ORDER BY ts DESC LIMIT 1000)`).
- Startup: if `osint_items` empty, seed from `INITIAL_OSINT_FEED` (one-shot).
- `localUsers` Map → `users` table; bcrypt hash on register.

**Verification**:
```bash
node tests/persistence.test.mjs  # insert, kill, restart, items still present
npm run dev &  # boot, then kill -9
npm run dev &  # items still there
```

**Rollback**: gate behind `PERSISTENCE_BACKEND=memory` env (default `sqlite`).

### T5 — Docker + reverse proxy

**Audit refs**: OPS-C6, OPS-M7
**Effort**: 0.5-1 day
**Files**:
- new `Dockerfile`
- new `docker-compose.yml`
- new `.dockerignore`
- new `docs/DEPLOYMENT.md` (new-developer-runnable)
- `server.ts` (graceful SIGTERM: close `http.Server`, stop auto-refresh interval)

**Dockerfile (multi-stage)**:

```dockerfile
# stage 1: build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# stage 2: runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/data && chown -R app:app /app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.cjs"]
```

**docker-compose.yml** (with caddy reverse-proxy example):

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    environment:
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-https://osintel.example.com}
      LLM_API_KEY: ${LLM_API_KEY}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      KNOWS_API_KEY: ${KNOWS_API_KEY}
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
volumes:
  caddy_data:
  caddy_config:
```

**docs/DEPLOYMENT.md** covers: prerequisites, `.env` template, `docker compose up`,
TLS via Caddy auto-Let's-Encrypt, log location, backup (`cp data/app.db`), rollback,
healthcheck interpretation.

**Verification**:
```bash
docker build -t osintel-pancrepal:test .
docker run --rm -p 3001:3000 -e JWT_SECRET=dev osintel-pancrepal:test
curl localhost:3001/healthz  # → 200 {"status":"ok"}
```

**Rollback**: keep existing `npm run build && npm start` flow — Docker is opt-in.

### T6 — CI/CD pipeline

**Audit refs**: OPS-C4, OPS-M6
**Effort**: 0.5 day
**Files**:
- new `.github/workflows/ci.yml`
- new `.github/dependabot.yml`
- new `.github/PULL_REQUEST_TEMPLATE.md`
- new `CONTRIBUTING.md`
- new `LICENSE` (Apache-2.0 recommended for medical open-source)
- `package.json` (add `"license": "Apache-2.0"`, `"test": "node --test tests/"`)

**ci.yml**:

```yaml
name: CI
on:
  push: { branches: [main, 'feat/**'] }
  pull_request: { branches: [main] }
jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix: { node-version: [18.x, 22.x] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: npm audit --audit-level=high --omit=dev || true
      - uses: actions/upload-artifact@v4
        if: matrix.node-version == '22.x'
        with: { name: dist, path: dist/ }
```

**Branch protection** (documented in CONTRIBUTING.md, applied by maintainer): require PR,
1 review, status checks (CI), no direct push to `main`.

**Verification**: push to `feat/production-hardening`, watch Actions tab pass on both Node
versions.

**Rollback**: disable workflow from GitHub UI; no code rollback needed.

### T7 — Frontend resilience + demo labelling

**Audit refs**: FE-C1, FE-C5, BE-M5, BE-M7, OPS m6
**Effort**: 0.5 day
**Files**:
- new `src/components/ErrorBoundary.tsx`
- `src/main.tsx` (wrap with ErrorBoundary)
- `src/App.tsx` (SSE cleanup in useEffect return)
- `src/components/WatchdogConsoleView.tsx` (DEMO watermark)
- `src/lib/news/refresh.ts` (`buildFallbackItems` gated behind `NODE_ENV !== 'production'`
  and stamped with `sourceKey: 'fallback'`)
- `src/App.tsx` (top banner if `INITIAL_OSINT_FEED` fallback active — "Seed-only / static mode")
- `tests/frontend-resilience.test.mjs` (renders ErrorBoundary, asserts fallback UI)

**Key code**:

```tsx
// src/components/ErrorBoundary.tsx
import React from 'react';
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Best-effort log; ignore network failure
    fetch('/api/logs/client', { method: 'POST', body: JSON.stringify({ error: error.message, info }), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  }
  render() {
    if (this.state.error) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-8">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold">页面出错了 (Page Error)</h1>
            <p className="text-slate-400">系统暂时不可用。请刷新页面或返回首页。</p>
            <p className="text-xs text-slate-600">The system encountered an error. Please refresh or return home.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-sky-600 rounded">刷新 / Refresh</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Demo labelling**: `WatchdogConsoleView` shows a sticky `DEMO` badge; the API still returns
`mode: 'demo_only'` for `/watchdog`.

**Seed-only banner**: when `App.tsx` loads `INITIAL_OSINT_FEED` (no backend reachable),
render an amber banner at the top: `⚠️ 静态部署模式 · 显示打包快照，非实时数据 (Static/seed-only mode)`.

**Verification**:
```bash
npm run lint && npm run build
node tests/frontend-resilience.test.mjs  # if test added
# manual: trigger error in dev (e.g. null deref in a component) → see fallback UI, not white screen
```

**Rollback**: remove `<ErrorBoundary>` wrapper; revert refresh.ts gating.

## 7. Test plan

Per task above. Aggregate commands:

```bash
npm run lint           # tsc --noEmit
npm test               # runs all tests/*.test.mjs via node --test (added in T6)
npm run build          # vite build + esbuild server
docker build .         # T5
docker run --rm -p 3001:3000 -e JWT_SECRET=dev -e ALLOW_DEFAULT_ACCOUNT=1 osintel-pancrepal:test
curl localhost:3001/healthz        # 200
curl localhost:3001/api/osint/feed # works with seed
curl -X POST localhost:3001/api/osint/manual-ingest -d '{}' -H 'Content-Type: application/json'  # 401
```

## 8. Completion definition (DoD)

✅ Implemented & verified  ·  🔧 partial / needs follow-up  ·  ⭐ extra credit  ·  ⏳ deferred

| Task | DoD |
|---|---|
| T1 | ✅ helmet headers present, CORS whitelist enforced, 429 on flood, 500 returns `{status:'error',mode:'unavailable',requestId}`, pino logs JSON with redacted secrets |
| T2 | ✅ bcrypt hash in SQLite, JWT signed/verified, `/manual-ingest`/`/rollback`/`/chat-custom`/`/personal/translate` return 401 without token, `authRateLimit` triggers |
| T3 | ✅ `chat-custom` rejects `http://169.254.169.254`, rejects unknown host (unless `ALLOW_CUSTOM_LLM_HOST=1`), `reasoning` field never echoes baseUrl |
| T4 | ✅ items survive `kill -9` + restart, `errorLog` capped at 1000, startup warm-up loads last cache |
| T5 | ✅ `docker build` succeeds, `HEALTHCHECK` returns healthy, SIGTERM closes server cleanly, `docs/DEPLOYMENT.md` reproducible by a new dev |
| T6 | ✅ CI passes on Node 18 + 22, `npm audit --audit-level=high` clean or flagged, branch protection doc in `CONTRIBUTING.md` |
| T7 | ✅ forced error → fallback UI not white screen, SSE closed on unmount, watchdog shows DEMO badge, static deploy shows seed-only banner, `buildFallbackItems` gated |

## 9. Out of scope / known limitations

- No multi-replica horizontal scaling (single-process is intentional).
- No PHI field-level encryption (T15, depends on a KMS — deferred).
- No frontend PII scrubbing or react-markdown (T10).
- No real medical-reviewer workflow (T12/#9).
- `data/` directory contents are operator responsibility (Docker volume; backup strategy in DEPLOYMENT.md).

## 10. References

- Audit: [docs/process/2026-07-03-production-hardening-audit.md](../../process/2026-07-03-production-hardening-audit.md)
- Mock audit (#10): [docs/process/mock-audit.md](../mock-audit.md)
- Personalized design: [docs/superpowers/specs/2026-06-28-personalized-osintel-design.md](./2026-06-28-personalized-osintel-design.md)
- Independent deployment design (superseded by T5): [docs/superpowers/specs/2026-06-25-independent-deployment-v1-design.md](./2026-06-25-independent-deployment-v1-design.md)
