# Quickstart

Get the Pancreatic Cancer OSINT Hub running locally in just a few minutes.

## Prerequisites

- Node.js 18+ (tested on Node 22)
- npm

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

Copy the example and configure your keys. Every key is optional — the app degrades gracefully when keys are missing (simulated AI, offline mode).

```bash
cp .env.example .env
```

**Optional keys in `.env`:**

- **Gemini API** (for server-side AI)
  ```env
  GEMINI_API_KEY="your-gemini-api-key"
  ```

- **Local test login** (defaults shown)
  ```env
  DEFAULT_USERNAME="admin"
  DEFAULT_PASSWORD="pancreas123"
  ```

> Never commit `.env`. It is gitignored; only `.env.example` is tracked.

## 3. Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 4. Log In

Choose one of:

- **Local account:** use `admin` / `pancreas123` (or register a new account)
- **One-click demo login** for a quick guest session
- **Google / email** via Firebase (advanced section)

## 5. Try the Features

1. **Globe** — click the globe tab to see an interactive 3D map
2. **News Feed** — view aggregated clinical news and research
3. **Resource Map** — explore clinical trial sites and resources
4. **Watchdog Console** — autonomous monitoring and alerts
5. **Daily Briefing** — AI-summarized daily highlights

## 6. AI Chat

Click the **Chat** tab to interact with the AI assistant. If you have a `GEMINI_API_KEY` set, you'll get real AI responses; otherwise, simulated responses.

## Verify Installation

```bash
npm run lint                   # TypeScript type-check
npm run build                  # Production build
```

Both should complete without errors.

## Build & Serve Production

```bash
npm run build
npm start    # serves dist/server.cjs
```

## Troubleshooting

- **"AI responses are generic"** — `GEMINI_API_KEY` is not set or unreachable. Set it in `.env` and restart `npm run dev`.
- **"Changes to server.ts not showing"** — the Express server doesn't hot-reload. Restart `npm run dev`.
- **"Port 3000 already in use"** — the dev server is already running, or another process is using port 3000. Kill the old process or specify a different port.
- **Build fails with "module not found"** — run `npm install` again to ensure all dependencies are present.

## Next Steps

- Read [README.md](./README.md) for features and architecture overview
- Check [AGENTS.md](./AGENTS.md) for development guidelines
- Review [docs/design/PRD.md](./docs/design/PRD.md) for product requirements
- See [docs/process/](./docs/process/) for decision logs and progress

## Support

For issues, feature requests, or contributions, please open an issue or pull request on GitHub.
