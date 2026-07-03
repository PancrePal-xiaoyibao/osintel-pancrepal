# 生产硬化综合审计报告 (Production Hardening Audit)

> Date: 2026-07-03
> Scope: Parent issue [#3](https://github.com/PancrePal-xiaoyibao/osintel-pancrepal/issues/3)
> Prerequisite: Issue [#10](https://github.com/PancrePal-xiaoyibao/osintel-pancrepal/issues/10) (Mock audit) — CLOSED in commit `0690ca7`
> Branch: `feat/production-hardening`
> Auditors: 3 parallel agents (backend / frontend / devops) + manual review

## 0. TL;DR

The project is a **high-quality prototype** with strong domain work (13 search providers,
zero-hallucination review, personalized patient hub, 11 contract tests, 0 npm vulnerabilities),
but it **lacks the engineering baseline required to serve medical information to real patients**.

| Dimension | Score | One-line verdict |
|---|---|---|
| Backend production-readiness | **40 / 100** | No helmet/CORS/rate-limit, plaintext passwords, base64 pseudo-token, SSRF, in-memory state |
| Frontend UX/a11y | **58 / 100** | No ErrorBoundary, no plain-language mode (#7), prompt injection open, i18n gaps |
| DevOps / compliance | **38 / 100** | No CI/CD, no Docker, no structured logs, PHI unencrypted (HIPAA/GDPR/PIPL risk), no TLS |

**Compounded risk (#C1+#C2+#C3 from all three audits)**: an anonymous visitor can read every
patient's cancer-mutation profile and burn through the operator's LLM budget. **Medical +
financial dual risk that must be closed before any public exposure.**

## 1. Audit Findings (severity-ordered)

### 🔴 Critical (上线硬阻塞)

| ID | File:Line | Issue | Impact |
|---|---|---|---|
| BE-C1 | `server.ts:32` | No helmet / CORS / rate-limit / compression / body-size-limit / global error handler. 30 routes naked. | Public deploy gets CC'd, CSRF'd, body-bombed, leaks Express headers, rejects/opens CORS arbitrarily. |
| BE-C2 | `server.ts:827-886` | Plaintext password in `localUsers` Map; `makeToken` is unsigned base64 with no expiry; no auth middleware on any route. | Anyone can impersonate; credentials read straight from `.env` (`DEFAULT_PASSWORD=pancreas123`); register dumps plaintext into process memory. |
| BE-C3 | `server.ts:34-58, 144-183` | All runtime state in-memory: `osintFeed`, `cachedNewsRefresh`, `watchdogStatus.errorLog` (unbounded `unshift`), `localUsers`. Restart = total amnesia. | Registered users vanish, quota counters reset, error log grows unbounded → memory bloat. |
| BE-C4 | `server.ts:268-303, 955-1023` | Routes swallow exceptions into HTTP 200 (`res.json({status:'ok', reason:err.message})`); `/api/knows/*` have **no try/catch at all** → stack leak. | Client retry/alerting breaks; 500 stacks leak internal paths/env hints. |
| BE-C5 | `server.ts:1225-1432` | `/api/osint/chat-custom` lets client set arbitrary `baseUrl` and forwards `Authorization` verbatim. **SSRF**. | Attacker POSTs server to `http://169.254.169.254/...` → cloud metadata exfil. |
| BE-C6 | `server.ts:381-498` | `/api/osint/manual-ingest` no auth, no URL protocol whitelist, no HTML escape. | XSS/phishing injection into the production feed. |
| FE-C1 | `src/main.tsx` | No `ErrorBoundary` anywhere (`grep componentDidCatch` = 0 hits). Any chain `item.foo.bar` returning dirty data → full-screen white. | Medical users lose all info sources, no graceful fallback. |
| FE-C3 | `OSINTChatView.tsx:224`, `FloatingChatbot.tsx:223` | Chat endpoints POST full `messages` history verbatim; no PII scrub; user-controlled `system` role. | PII leakage to LLM vendor; prompt injection wide open. |
| FE-C4 | `MyPersonalView.tsx:115-310` | Patient profile (PHI) lives plaintext in LocalStorage and is POSTed to `/api/personal/*` — contradicts `PatientProfileView`'s "HIPAA LocalStorage Only" copy. | Compliance false-advertising + real PII exposure. |
| OPS-C1,2,3,4,5,6 | (see §3) | Plaintext auth + no security middleware + PHI unencrypted + no CI/CD + no secrets mgmt + no Docker/PM2. | Each is independently a hard launch blocker for a medical product. |

### 🟠 Major (上线 1-2 周内必须解决)

| ID | File:Line | Issue |
|---|---|---|
| BE-M1 | `server.ts` (1477 lines) | Single-file monolith: 30 routes + SSE + watchdog + auth + Gemini + gateway + static serving + startup. Half the routes have no `try`. |
| BE-M2 | `server.ts:1453-1474` | `setInterval` auto-refresh: no `unref`, no in-flight guard, no jitter, no SIGTERM cleanup → fanout stampede across replicas. |
| BE-M3 | `server.ts:308-378` | `fs.readFileSync`/`readdirSync`/`statSync` inline in request handlers → event-loop blocking. |
| BE-M4 | `server.ts:209-229` | `generateContentWithFallback` serial retry across 3 models, no `AbortSignal` → 90s+ hangs. |
| BE-M5, M7 | `refresh.ts:46-153` | `buildFallbackItems` injects 4 templated fake items with `evidenceLevel:'A'` when no providers return → medical misinformation risk. |
| BE-M6 | `server.ts:313` vs `cache.ts` | Two different `safeKey` implementations → `/api/osint/feed/cached` rarely hits the file backend writes. |
| BE-M8 | `search/providers/*.ts` | Every provider `catch {}` swallows errors returning `[]`; `reason` field empty. |
| BE-M11 | `news/aggregate.ts`, `news/knows-adapter.ts` | Marked `@deprecated` but still imported; dead code + unclear dependency graph. |
| FE-M6 | `MyPersonalView.tsx` (×6) | `catch (_) {}` empty blocks → user can't tell "stale data" from "no data". |
| FE-M9 | `translations.ts` vs `OSINTFeedView.tsx:193-744` | Two parallel i18n dicts; AR/RTL untouched; `tabAiElements` missing in 8 langs; typos ("情报情报门类"). |
| FE-M11 | `App.tsx:100`, `MyPersonalView.tsx` (×7) | `any` everywhere; `postJson<any>` for every fetch response → `resObj.itmes` typos compile. |
| FE-M12 | `OSINTChatView.tsx:428-571` | Hand-rolled Markdown via regex; no XSS hardening. |
| FE-M13, M14 | `WarRoomGlobe.tsx`, `ResourceMapView.tsx` | Three.js never pauses on tab hide; SVG globe re-renders 2200 points per frame. |
| OPS-M1 | `health-check.ts`, `server.ts:633-659` | `/healthz`/`/readyz` hardcoded `true`; never actually pings DB / LLM / disk. |
| OPS-M4 | `search/providers/*.ts` | No `User-Agent`, no robots.txt, no `Retry-After`, no ToS audit — Google CSE ToS violation likely. |
| OPS-M5 | n/a | No medical-reviewer role, no review queue API, no AI-content watermark (EU AI Act Art. 50 / China GenAI §12). |
| OPS-M6 | `package.json` | Express 4 (EOL 2024-10), no `license` field, no `npm audit` integration, no SBOM, no dependabot. |
| OPS-M7 | `server.ts:1453` | Bare HTTP 3000 on `0.0.0.0`; no reverse proxy, no TLS, no HSTS. |

### 🟡 Minor (后续迭代清理)

See individual agent transcripts: 12 backend, 10 frontend, 6 devops — total 28 minor items
(any/typos/hardcoded colors/duplicate storage APIs/double-scheduling/deprecated fields, etc.).

## 2. Top Production Blockers — by priority

Priority order = (legal/medical risk) × (work effort)⁻¹.

| # | Task | Issue | Effort | Blocker level |
|---|---|---|---|---|
| **T1** | HTTP security middleware + global error handler + structured logging | BE-C1, BE-C4, OPS-M1 | 1 d | Hard |
| **T2** | Real auth: bcrypt + signed JWT + auth middleware + rate-limit | BE-C2, OPS-C1 | 1-2 d | Hard |
| **T3** | SSRF protection + LLM gateway whitelist | BE-C5 | 0.5 d | Hard |
| **T4** | Persistence layer (SQLite, replaces in-memory) + startup warm-up + bounded log | BE-C3, OPS-M2 | 1-2 d | Hard |
| **T5** | Docker (multi-stage Dockerfile + compose + HEALTHCHECK) + reverse proxy doc | OPS-C6, OPS-M7 | 0.5-1 d | Hard |
| **T6** | CI/CD pipeline (lint+test+build+audit) + dependabot + branch protection | OPS-C4 | 0.5 d | Hard |
| **T7** | Frontend ErrorBoundary + SSE cleanup + static-mode banner + demo-data labelling | FE-C1, FE-C5, BE-M5/M7 | 0.5 d | High |
| **T8** | Test infra upgrade (vitest + supertest) + 11 `.mjs` migration + route integration tests | BE-m10 | 1-2 d | High |
| **T9** | `server.ts` modularization (routes/ + middleware/ + lib/ + jobs/) | BE-M1 | 1 d | High |
| T10 | Frontend PII scrub on chat send + react-markdown renderer | FE-C3, FE-M12 | 1 d | Medium |
| T11 | Plain-language mode (通俗模式) + term glossary + TL;DR | FE-C2, #7 | 2-3 d | Medium |
| T12 | Pancreatic center contribution UI + review queue | #9 | 3-5 d | Medium |
| T13 | Video integration (YouTube/Bilibili transcripts + summary) | #8 | 4-5 d | Medium |
| T14 | Search filters + export (CSV/JSON) + RSS scheduler | #6 | 3-4 d | Medium |
| T15 | PHI field-level encryption + audit log | OPS-C3 | 2-3 d | Hard (post-T4) |
| T16 | Data-source ToS audit + attribution + robots.txt | OPS-M4 | 1 d | Medium |

## 3. Recommended execution plan

**This PR (`feat/production-hardening`)**: T1, T2, T3, T4, T5, T6, T7 — the hard blockers.
That closes the "anonymous visitor reads all PHI + burns LLM budget" risk and gives the project
a real deployment story. Estimated 5-7 days of focused work.

**Next PR**: T8 (test infra), T9 (modularization), T10 (frontend PII/markdown) — pays down the
maintenance debt so future feature work is safe.

**Subsequent PRs** (per community issues #6/#7/#8/#9): T11 → T14 → T13 → T12 → T15 → T16.

## 4. Reference — original detailed agent transcripts

- Backend audit (40/100): see `docs/process/audit/2026-07-03-backend.md` (excerpts in §1).
- Frontend audit (58/100): see `docs/process/audit/2026-07-03-frontend.md` (excerpts in §1).
- DevOps audit (38/100): see `docs/process/audit/2026-07-03-devops.md` (excerpts in §1).

Each P0 task gets its own spec at `docs/superpowers/specs/2026-07-03-*.md` and a tracked
GitHub issue under parent #3.
