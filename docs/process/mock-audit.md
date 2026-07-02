# Mock Audit for [Issue #10](https://github.com/PancrePal-xiaoyibao/osintel-pancrepal/issues/10)

Parent issue: #3

## Objective

The production release path must distinguish real data flows from graceful
fallbacks and demo-only surfaces. A feature can only be treated as complete when
it either reaches a real upstream source/model or clearly reports that it is
unavailable. Demo content must not be inserted into production feed state.

## Mode Contract

- `real`: A request reached a real upstream data source or configured model.
- `graceful_fallback`: A request used deterministic extraction or cached/seed
  data with the limitation explicitly reported.
- `demo_only`: The endpoint is an interactive demonstration and is not a
  production capability.
- `unavailable`: No real upstream or safe fallback is available.

## Architecture Decision

- **Selected Stack**: Existing TypeScript, React, Express, Vite, unified search
  registry, and current Node contract tests.
- **Rationale**: The app already has a single-process full-stack deployment and
  real search adapters. Filling mock gaps in place keeps the release focused and
  avoids introducing a new service boundary.
- **Pattern**: API-first hardening. Backend routes own the mode contract;
  frontend surfaces render the mode without fabricating data.
- **Trade-off**: Demo-only watchdog/rollback features remain callable for now
  but are explicitly labeled and excluded from production readiness.

## Audit Status

| Area | Previous state | Current target |
| --- | --- | --- |
| `/api/osint/fetch` | Random simulated item could enter `osintFeed` | Use real search/news pipeline only; no synthetic insert |
| `/api/osint/daily-summary` | Fixed simulated clinical claims | Extractive summary from current feed when LLM is unavailable |
| `/api/osint/watchdog` | Simulated telemetry looked operational | Mark `demo_only`; add real `/healthz`, `/readyz`, `/api/ops/status` |
| `/api/osint/rollback` | Fixed fake rollback tag | Return `unavailable` with runbook guidance |
| `/api/osint/chat*` | High-fidelity simulated medical answer | Return model output or clear unavailable response |
| News fallback | Synthetic fallback data | Keep `mode=fallback` and clear source status |
| Static seed mode | Seed data can look live | Document static/seed-only mode |

## Checkfix Requirements

Every change in this issue must run:

```bash
npm run lint
npm run build
node tests/mock-audit.test.mjs
```

If optional native npm dependencies break local build, run
`npm install --include=optional` and keep lockfile changes scoped.
