# Quickstart

Get the Pancreatic Cancer OSINT Hub running locally in a few minutes.

## Prerequisites

- Node.js 18+ (tested on Node 22)
- npm

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy the example file and fill in what you have. Every key is optional — the app
degrades gracefully with explicit `unavailable` / `graceful_fallback` modes and
anonymous evidence search when keys are missing.

```bash
cp .env.example .env
```

Key groups in `.env`:

- **LLM (recommended)** — for real AI translation, review synthesis, assistant,
  and the floating chatbot. Any OpenAI-compatible provider works; StepFun is
  preconfigured as the default base URL:
  ```env
  LLM_API_KEY="your-openai-compatible-key"
  LLM_BASE_URL="https://api.stepfun.com/v1"
  LLM_MODEL="step-3.5-flash"
  ```
  Alternatively set `GEMINI_API_KEY` to use Google Gemini server-side.

- **KnowS evidence search** — optional. The public anonymous tier works without a
  key; set `KNOWS_API_KEY` only for higher rate limits.
  ```env
  KNOWS_API_KEY=""
  KNOWS_BASE_URL="https://api.nullht.com"
  ```

- **Local test login** — defaults shown; change as needed:
  ```env
  DEFAULT_USERNAME="admin"
  DEFAULT_PASSWORD="pancreas123"
  ```

> Never commit `.env`. It is gitignored. Only `.env.example` is tracked.

## 3. Run

```bash
npm run dev
```

Open http://localhost:3000.

## 4. Log in

On the login screen use one of:

- **Account login (test):** username `admin`, password `pancreas123`
  (or register a new account in the form).
- **One-click demo login** for a quick guest session.
- Google / email via Firebase (advanced section).

## 5. Try the personalized hub

1. Open the **我的专属 / My** tab.
2. If prompted, fill in a de-identified profile (e.g. mutation `KRAS G12D`,
   city). Save it.
3. Back in the My hub, the five sections load: personalized news, 90-day
   articles, PubMed papers, recruiting trials, KnowS evidence search, and the AI
   assistant.
4. Toggle **AI 中文翻译** to translate English papers/trials to Chinese.
5. In the AI assistant, click **生成综述** for a zero-hallucination review.

## 6. Floating AI chatbot

Click the robot button (bottom-left). Configure provider/model/key in its
settings, set an optional system context, and chat. Conversations and reasoning
are saved per session in your browser.

## Verify (optional)

```bash
npm run lint                          # TypeScript type-check
node tests/research-pipeline.test.mjs # research + zero-hallucination verifier
node tests/knows-client.test.mjs      # KnowS client + normalizer
npm run build                         # production build
```

## Build & serve production

```bash
npm run build
npm start    # serves dist/server.cjs
```

## Troubleshooting

- **AI replies are unavailable** — no LLM key is reachable. Set `LLM_API_KEY`
  (or `GEMINI_API_KEY`) in `.env` and restart `npm run dev`. The app does not
  generate simulated medical answers when no real model is configured.
- **Evidence/news shows fallback data** — external APIs (KnowS / Europe PMC /
  ClinicalTrials.gov) may be unreachable from your network; the app falls back
  to seeded content. A bad `KNOWS_API_KEY` auto-falls back to the anonymous tier.
- **Changes to `server.ts` not reflected** — restart `npm run dev` (the server
  process does not hot-reload).
