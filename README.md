# Pancreatic Cancer OSINT Intelligence Hub (胰腺癌 OSINT 情报中心)

An autonomous open-source intelligence (OSINT) platform for pancreatic cancer research and patient support. It aggregates clinical news, trials, literature, and resources; applies AI translation and entity analysis; and ships with an interactive globe, resource map, watchdog console, and daily AI briefing.

> **Disclaimer:** All AI-processed summaries are research references only and do not constitute clinical diagnosis or treatment advice. Always follow a licensed oncologist and multidisciplinary team (MDT).

## Features

- **Interactive globe + resource map** — 3D Earth visualization of clinical sites, news sources, and patient resources
- **AI-powered watchdog console** — autonomous monitoring and alert system for pancreatic cancer research
- **Daily AI briefing** — aggregated daily summaries of clinical news and emerging research
- **Multi-provider LLM gateway** — Gemini, OpenAI, and other OpenAI-compatible endpoints
- **AI chat and assistant UI** — powered by `ai-elements` for rich conversational experience
- **Auth** — Firebase (Google/email) plus local username/password mode with `.env` test credentials
- **Responsive design** — Tailwind CSS v4, React 19, accessible to all users

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Three.js (globe), Lucide icons
- **Backend:** Express (Node.js, `server.ts`) as API + LLM proxy
- **AI:** `@google/genai` and any OpenAI-compatible provider
- **Data:** Firebase (Auth/Firestore) for cloud profile sync; seed data for dev
- **External APIs:** Gemini API, clinical trial registries, news feeds

## Quick Start

See [quickstart.md](./quickstart.md). In short:

```bash
npm install
cp .env.example .env   # fill in keys (all optional)
npm run dev            # http://localhost:3000
```

Default local login: `admin` / `pancreas123` (configurable in `.env`).

## Project Structure

```
.
├── server.ts                 # Express server: API routes + LLM proxy
├── src/
│   ├── App.tsx               # App shell, tabs, routing
│   ├── components/           # UI views (feed, map, globe, auth, ...)
│   ├── lib/
│   │   ├── firestore-sync.ts # Cloud profile sync
│   │   └── ...               # shared logic
│   ├── firebase.ts           # Firebase web init
│   ├── types.ts              # TypeScript types
│   ├── translations.ts       # i18n dictionary
│   └── index.css             # global styles
├── tests/                    # Node contract tests (*.test.mjs)
├── docs/
│   ├── design/               # PRD, schema, design references
│   ├── process/              # decision-log, progress, handoff
│   └── superpowers/          # specs, plans, runbooks
├── .env.example              # Environment variables template
└── package.json              # Dependencies
```

## Environment Variables

| Variable | Purpose | Required |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini API calls | Optional (falls back to simulated AI) |
| `DEFAULT_USERNAME` / `DEFAULT_PASSWORD` | Local test account | Optional (defaults `admin`/`pancreas123`) |
| `VITE_FIREBASE_*` | Override Firebase web config | Optional |
| `APP_URL` | Self-referential app URL | Optional |

Secrets live only in `.env` (gitignored). `firebase-applet-config.json` is a Firebase **web** client config (public by design); replace with your own project or use `VITE_FIREBASE_*` env vars.

## Scripts

- `npm run dev` — start the full-stack dev server (`tsx server.ts`)
- `npm run build` — production Vite + server bundle
- `npm start` — run the built server from `dist/server.cjs`
- `npm run lint` — TypeScript type-check (`tsc --noEmit`)

## Documentation

- **Product requirements:** [docs/design/PRD.md](./docs/design/PRD.md)
- **Schema & design references:** [docs/design/](./docs/design/)
- **Decision & progress logs:** [docs/process/](./docs/process/)
- **Contributor guide:** [AGENTS.md](./AGENTS.md)
- **Implementation specs:** [docs/superpowers/specs/](./docs/superpowers/specs/)

## License

This project is part of the PancrePal initiative. See LICENSE file for details.

## Contributing

Please see [AGENTS.md](./AGENTS.md) for development guidelines, coding standards, and pull request procedures.
