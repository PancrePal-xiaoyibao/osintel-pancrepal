# Pancreatic Cancer OSINT Intelligence Hub (胰腺癌 OSINT 情报中心)

An autonomous open-source intelligence (OSINT) platform for pancreatic cancer.
It aggregates clinical news, trials, literature, and patient-support resources;
applies AI translation, entity tagging, and risk scoring; and ships a
**personalized hub** where a patient's de-identified profile drives a tailored
feed of news, recent articles, PubMed papers, recruiting trials, evidence
search, and a grounded AI assistant.

> Disclaimer: All AI-processed summaries are research references only and do not
> constitute clinical diagnosis or treatment advice. Always follow a licensed
> oncologist and MDT.

## Features

- **Personalized "My" hub** — enter a de-identified profile (mutations, city,
  regimen) and get a tailored stream: personalized news windows (24h/7d/30d),
  90-day related articles, condition-matched PubMed papers, recruiting clinical
  trials, multi-source evidence search, and a grounded AI assistant.
- **Zero-hallucination literature review** — papers (Europe PMC) + trials
  (ClinicalTrials.gov) build a citation registry; the synthesis LLM is
  constrained to real ids and any fabricated PMID/NCT is dropped before render.
- **Real-time aggregated news search (not a demo)** — the homepage feed fans out
  to multiple real search capabilities in parallel and merges them into ranked
  24h/7d/30d windows: **KnowS** (papers/guidelines/trials), **Europe PMC /
  PubMed**, **ClinicalTrials.gov v2**, and **AnySearch** web/news. Every item
  keeps its real source URL (citation-resolvable, no fabricated content). The
  feed **auto-refreshes every 5 minutes** and the sidebar shows live per-source
  status chips. New adapters (LLM-grounded search, MCP search) plug in via
  `src/lib/news/aggregate.ts`.
- **KnowS evidence search** — a shared client over the public KnowS OpenAPI
  (English/Chinese papers, meetings, guidelines, trials, package inserts) used by
  the news pipeline, the personalized routes, and the assistant. Falls back to
  the anonymous tier automatically.
- **AI Chinese translation** — on-demand LLM translation of English titles and
  abstracts, preserving gene/drug/PMID/NCT tokens.
- **Global floating AI chatbot** — provider/model selection (incl. custom),
  credential and system-context config, multi-session history, and a collapsible
  reasoning ("thinking") view.
- **Multi-provider LLM gateway** — SiliconFlow, DashScope, OpenRouter, Gemini,
  OpenAI, Fireworks, StepFun, and any OpenAI-compatible endpoint, configurable
  per-client or via a server-side `.env` default.
- **Interactive globe + resource map**, **autonomous watchdog console**, and a
  **daily AI briefing**.
- **Auth** — Google / email (Firebase) plus a local username/password mode with
  registration and an `.env` default account for testing.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS v4, Three.js, Lucide icons
- Backend: Express (single Node process, `server.ts`) as an API + LLM proxy
- AI: `@google/genai` and any OpenAI-compatible provider
- Data: Firebase (Auth/Firestore) for cloud profile sync; in-memory + seed data
- External APIs: KnowS OpenAPI, Europe PMC, ClinicalTrials.gov v2, AnySearch, Tavily, Serper/Google, Metaso, Brave, Exa, Semantic Scholar, OpenAlex

## Quick Start

See [quickstart.md](./quickstart.md). In short:

```bash
npm install
cp .env.example .env   # then fill in keys (all optional except as noted)
npm run dev            # http://localhost:3000
```

Default local login for testing: `admin` / `pancreas123` (configurable in `.env`).

## Deployment: live data vs. static build (important)

The news, hospitals, and treatment data are served by the Express API in
`server.ts`. How you deploy decides whether the feed is **live** or **seed-only**:

- **Full-stack (recommended, live data):** build and run the Node server so the
  `/api/*` routes are available. The homepage news feed then performs real
  multi-source aggregation (KnowS + PubMed + ClinicalTrials.gov + AnySearch) and
  auto-refreshes every 5 minutes.
  ```bash
  npm run build
  npm start        # serves the API + the built static frontend on one port
  ```
- **Static-only (frontend bundle, no Node server):** if you deploy just the
  `dist/` output to a static host, the `/api/*` calls have no backend. The app
  **gracefully falls back to the bundled seed dataset** so news, hospitals, and
  treatments still render — but they are the packaged snapshot, **not** live
  search results, and the 5-minute refresh has nothing live to pull.

> Reminder: after changes, run `npm run lint` (type-check) and `npm run build`.
> Redeploying `main` makes hospitals/news/treatments appear; for **real-time**
> news you must run the Node server (`npm run build` → `npm start`). A pure
> static deploy always shows the bundled seed data.

## Project Structure

```
.
├── server.ts                 # Express server: API routes + multi-provider LLM proxy
├── src/
│   ├── App.tsx               # App shell, tabs, auth wiring
│   ├── components/           # Views (feed, map, My hub, chatbot, auth, ...)
│   ├── lib/
│   │   ├── knows/            # Shared KnowS evidence search client + normalizer
│   │   ├── research/         # Europe PMC + ClinicalTrials.gov + zero-hallucination review
│   │   ├── search/           # Unified pluggable search module (13 providers)
│   │   ├── news/             # News pipeline (ranking, windows, KnowS adapter)
│   │   └── globe/            # Three.js globe renderer
│   ├── firebase.ts           # Firebase web init (public client config)
│   ├── types.ts              # Shared types
│   └── translations.ts       # i18n dictionary
├── tests/                    # Node contract tests (*.test.mjs)
├── plans/                    # Implementation plans
├── docs/
│   ├── design/               # PRD, schema design, prompt/design references
│   ├── process/              # decision-log, progress, handoff, git-log
│   └── superpowers/          # specs, plans, runbooks
├── supabase/                 # Schema/migration scaffolding
└── .env.example              # Required/optional environment variables
```

## Environment Variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini calls | Optional (AI endpoints report unavailable or use extractive fallback when absent) |
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | Server-side OpenAI-compatible LLM (e.g. StepFun) for translate/review/assistant/chatbot | Optional |
| `KNOWS_API_KEY` / `KNOWS_BASE_URL` | KnowS evidence search (anonymous tier works without a key) | Optional |
| `ANYSEARCH_API_KEY` / `ANYSEARCH_ENDPOINT` | AnySearch web/news source for the news aggregator (anonymous tier works without a key) | Optional |
| `TAVILY_API_KEY` | Tavily news search | Optional |
| `SERPER_API_KEY` | Google web search via Serper.dev | Optional |
| `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` | Google CSE (alternative to Serper) | Optional |
| `METASO_API_KEY` | Metaso/秘塔 Chinese AI search | Optional |
| `BRAVE_API_KEY` | Brave web search | Optional |
| `EXA_API_KEY` | Exa neural search | Optional |
| `NEWS_DISABLE_WEBSEARCH` | Set to `1` to disable the AnySearch web/news source | Optional |
| `DEFAULT_USERNAME` / `DEFAULT_PASSWORD` | Default local test account | Optional (defaults `admin`/`pancreas123`) |
| `APP_URL` | Self-referential app URL | Optional |
| `VITE_FIREBASE_*` | Override Firebase web config | Optional |

Secrets live only in `.env` (gitignored). `firebase-applet-config.json` holds a
Firebase **web** client config, which is public by design and safe to commit;
replace it with your own project via the file or `VITE_FIREBASE_*` env vars.

## Runtime Modes

Production-facing APIs now report explicit modes:

- `real` — backed by a live upstream search source, data source, or configured model.
- `graceful_fallback` — deterministic extraction from existing real/seed items; no new medical claims are generated.
- `demo_only` — legacy demonstration surfaces such as the watchdog console.
- `unavailable` — no real upstream or safe fallback is configured.

AI chat endpoints no longer fabricate medical answers when no provider key is
available. Configure `LLM_API_KEY` or `GEMINI_API_KEY` for model output.

## Scripts

- `npm run dev` — start the full-stack dev server (`tsx server.ts`)
- `npm run build` — production Vite + server bundle
- `npm start` — run the built server
- `npm run lint` — TypeScript type-check (`tsc --noEmit`)
- `node tests/<name>.test.mjs` — run a contract test

## Contributors

[![contrib.rocks image](https://contrib.rocks/image?repo=PancrePal-xiaoyibao/osintel-pancrepal&columns=12&max=60)](https://contrib.rocks/repo?repo=PancrePal-xiaoyibao/osintel-pancrepal)

## Documentation

- Product requirements: [docs/design/PRD.md](./docs/design/PRD.md)
- Personalized OSINTel design: [docs/superpowers/specs/2026-06-28-personalized-osintel-design.md](./docs/superpowers/specs/2026-06-28-personalized-osintel-design.md)
- Contributor guide: [AGENTS.md](./AGENTS.md)
- Process logs: [docs/process/](./docs/process/)
