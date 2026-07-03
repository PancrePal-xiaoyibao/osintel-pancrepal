# Deployment Guide (T5)

> Zero-to-running guide for the Pancreatic Cancer OSINT Hub.
> Audience: a new operator who has never deployed this app before.
> Goal: by the end, you have a TLS-terminated public instance with persisted data.

## TL;DR

```bash
git clone https://github.com/PancrePal-xiaoyibao/osintel-pancrepal.git
cd osintel-pancrepal
cp .env.example .env
# edit .env: set JWT_SECRET, APP_DOMAIN, CORS_ALLOWED_ORIGINS, optionally LLM_API_KEY
docker compose up -d
```

Open `https://<APP_DOMAIN>` — done.

---

## 1. Prerequisites

| Need | Version | Why |
|---|---|---|
| Docker Engine | 24+ | Runs the multi-stage build + runtime |
| Docker Compose | v2 (the `docker compose` plugin) | Orchestrates app + Caddy |
| A public domain | — | Caddy needs a DNS A record to issue a Let's Encrypt cert |
| Outbound HTTPS | — | Server must reach KnowS / PubMed / ClinicalTrials.gov / LLM providers |

> No Node.js required on the host — it ships in the `node:24-alpine` image.

## 2. Configure environment

Copy the template and edit `.env`:

```bash
cp .env.example .env
```

**Required** (the app refuses to boot in production without these):

```env
NODE_ENV=production
JWT_SECRET="<32+ random chars>"        # generate: openssl rand -hex 32
APP_DOMAIN=osintel.yourdomain.com       # DNS A record must point here
CORS_ALLOWED_ORIGINS=https://osintel.yourdomain.com
ALLOW_DEFAULT_ACCOUNT=0                 # do NOT ship admin/pancreas123 in prod
```

**Optional** (each enables a real data path; app degrades gracefully when absent):

```env
LLM_API_KEY=...        # OpenAI-compatible (StepFun default), for AI translate/review/assistant/chatbot
LLM_BASE_URL=https://api.stepfun.com/v1
LLM_MODEL=step-3.5-flash
GEMINI_API_KEY=...     # alternatively, Google Gemini server-side
KNOWS_API_KEY=...      # higher rate limits; anonymous tier works without it
TAVILY_API_KEY=...
SERPER_API_KEY=...
BRAVE_API_KEY=...
EXA_API_KEY=...
METASO_API_KEY=...
```

> Never commit `.env`. It's gitignored. Only `.env.example` is tracked.

## 3. Point DNS

Add an A record at your DNS provider:

```
osintel.yourdomain.com.   A   <your-server-public-IP>
```

Wait for it to propagate (`dig osintel.yourdomain.com`).

## 4. Launch

```bash
docker compose up -d
docker compose ps           # both app + caddy should show "healthy"
docker compose logs -f app  # tail structured logs
```

Caddy will:
1. Listen on :80 and :443.
2. On first request, provision a Let's Encrypt cert for `APP_DOMAIN`.
3. Proxy all traffic to the app container on :3000.

## 5. Verify

```bash
# From your server (or any host with HTTPS)
curl -i https://osintel.yourdomain.com/healthz
# Expect: HTTP/2 200 + helmet security headers + Strict-Transport-Security

curl https://osintel.yourdomain.com/readyz
# Expect: {"status":"ok", "checkedAt":"...", ...}

curl -i -X POST https://osintel.yourdomain.com/api/osint/manual-ingest \
  -H 'Content-Type: application/json' -d '{}'
# Expect: 401 {status:"error", code:"no_token"}  ← auth middleware is working
```

Open `https://osintel.yourdomain.com` in a browser. The feed loads from the persisted
SQLite seed; a 5-minute background refresh will start pulling live data.

## 6. Where data lives

| Path | Purpose | Back up? |
|---|---|---|
| `./data/app.db` | SQLite: users, osint_items, resource_centers, event_log | **YES** |
| `./data/search-cache/` | Search aggregator disk cache (5-min TTL) | Optional |
| `caddy_data` (docker volume) | TLS cert + ACME state | Optional |

### Backup

```bash
docker compose exec app cat /app/data/app.db > backup-$(date +%F).db
# Or simply:
cp ./data/app.db ./backups/app-$(date +%F).db
```

Restore by stopping the app, replacing `./data/app.db`, and `docker compose up -d`.

## 7. Operations

### View logs

```bash
docker compose logs -f app     # the Node server (pino JSON)
docker compose logs -f caddy   # access log (JSON)
```

### Update to a new version

```bash
git pull
docker compose build app
docker compose up -d app
```

The SQLite migration is idempotent — existing tables are kept, new columns/tables added.

### Rollback

```bash
git log --oneline                  # find the previous commit
git checkout <prev-commit-sha> -- .
docker compose build app
docker compose up -d app
# Restore the DB if a migration needs undoing:
cp ./backups/app-<date>.db ./data/app.db
docker compose restart app
```

### Restart / stop

```bash
docker compose restart app
docker compose down                # stop, keep volumes
docker compose down -v             # stop AND wipe caddy volume (certs!) — careful
```

## 8. Health & readiness contract

| Endpoint | Meaning | Used by |
|---|---|---|
| `/healthz` | Liveness — process is up and answering | Docker HEALTHCHECK, Caddy, monitoring |
| `/readyz` | Readiness — process is up + DB reachable | Load balancers, deploy gates |
| `/api/ops/status` | Full ops snapshot (counts, cache state, issues) | Operators, on-call dashboards |
| `/api/health` | Legacy alias of /healthz | Back-compat |

A failing `/readyz` should remove the instance from rotation but **not** restart it.
A failing `/healthz` should restart the container.

## 9. Static-only (no Node server)

If you only deploy the `dist/` folder to a static host (Cloudflare Pages, Netlify, Vercel):
- The `/api/*` calls will fail.
- The app falls back to the bundled seed dataset.
- A prominent amber banner shows `⚠️ 静态部署模式 · 非实时数据`.
- The 5-minute refresh has nothing to pull.
- Use this only for preview / demo, never for production patients.

## 10. Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Container exits on boot | `JWT_SECRET` missing | Set a 16+ char secret in `.env` |
| Caddy can't get a cert | DNS not propagated / port 80 blocked | Verify `dig` + firewall |
| `/healthz` 200 but feed empty | All search keys missing | Set at least one of `LLM_API_KEY` / `KNOWS_API_KEY` |
| 429 on chat endpoints | LLM rate limit hit | Raise `RATE_LIMIT_LLM_MAX` in `.env` |
| Watchdog UI looks real | It's `demo_only` | Use `/healthz` and `/api/ops/status` for real status |

## 11. Reference

- Architecture: [docs/superpowers/specs/2026-07-03-production-hardening-spec.md](./superpowers/specs/2026-07-03-production-hardening-spec.md)
- Mode contract: [docs/process/mock-audit.md](./process/mock-audit.md)
- Quickstart (local dev): [quickstart.md](../quickstart.md)
- Contributing: [CONTRIBUTING.md](../CONTRIBUTING.md)
