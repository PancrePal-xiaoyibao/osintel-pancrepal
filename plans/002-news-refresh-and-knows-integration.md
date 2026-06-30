# Plan 002: Build source-managed news refresh with KNOWS fallback

> **Executor instructions**: Follow the steps in order. Run every verification
> command and confirm the expected result before moving on. If any STOP
> condition happens, stop and report instead of improvising.
>
> **Drift check (run first)**:
> `git diff --stat 59bbaca..HEAD -- src/components/OSINTFeedView.tsx src/components/OSINTChatView.tsx src/seed-data.ts src/types.ts src/lib server.ts .env.example docs/progress.md docs/git-log.md`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: 001
- **Category**: direction
- **Planned at**: commit `59bbaca`, 2026-06-26

## Why this matters

The product needs a real news stream, not a static demo list. The target is a
5-minute refresh cadence, at least 24h to 30d of recency windows, 300+ items
when the data source allows it, and a ranking model that prefers major treatment
centers, then fills in clinical, drug, target, trial, psychology, and nutrition
signals. The `KNOWS_API_KEY` and `KNOWS_BASE_URL` hooks must be present so the
Chinese OpenEvidence-like source can be swapped in without changing the UI.

## Current state

- `src/seed-data.ts:1-92` seeds only a handful of feed items.
- `src/types.ts:1-33` has only the current demo-level item shape and no
  freshness window or source-quality contract.
- `src/components/OSINTFeedView.tsx:39-56` maps the current coarse categories
  but has no tag-level ranking or time-window badges.
- `src/components/OSINTChatView.tsx:339-359` already posts to
  `/api/osint/chat-custom`, so the server route is the natural place to attach
  a shared knowledge adapter later.
- `.env.example:1-9` only documents `GEMINI_API_KEY` and `APP_URL`.
- `docs/news-review-promotion-workflow.md:1-78` already defines the collector
  -> review -> promotion boundary and should be followed.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run lint` | exit 0 |
| Build smoke | `npm run build` | exit 0 |
| Collector tests | `node tests/news-collector.test.mjs` | exit 0 |

## Scope

**In scope**

- `server.ts`
- `src/lib/news/*`
- `src/components/OSINTFeedView.tsx`
- `src/types.ts` if the item contract needs new fields
- `.env.example`
- `tests/news-collector.test.mjs`
- `docs/progress.md`
- `docs/git-log.md`

**Out of scope**

- Supabase migration authoring beyond the schema contract plan
- The AI Elements visual redesign
- Rewriting the entire feed page layout

## Steps

### Step 1: Add the env contract and provider interface

Add `KNOWS_API_KEY` and `KNOWS_BASE_URL` to `.env.example`. In code, create a
small server-side adapter interface that can talk to `knows` now and leave room
for the future `baseRul` provider without changing the feed contract.

Verify:
`npm run lint`
Expected: exit 0.

### Step 2: Implement the normalized news model

Create a `news` module that normalizes incoming sources into a single shape with
these fields:

- source title, URL, and source type
- published/observed time
- topic tags
- evidence level
- freshness window
- center priority flag
- risk/review status
- content tags
- a source evidence list

Use the pposintel docs as the vocabulary source, not the current seed data.

Verify:
`node tests/news-collector.test.mjs`
Expected: the test fails until the normalizer exists.

### Step 3: Add the KNOWS fetch path

Implement a server-side POST client for the sample endpoint pattern from the
user request:
`https://api.nullht.com/v1/evidences/ai_search_paper_en`

Treat the endpoint as a configurable base URL, not a hardcoded URL. The client
should accept a query, normalize the returned evidence, and fall back cleanly
when the API key is absent or the request fails.

Verify:
`node tests/news-collector.test.mjs`
Expected: pass for the mocked KNOWS adapter path.

### Step 4: Build the refresh loop and ranking rules

Add a 5-minute refresh path on the server. The ranking rules should prefer:

1. major pancreatic treatment centers
2. clinical and trial updates
3. drug/target/mechanism news
4. psychology and nutrition as secondary coverage

The UI should be able to request 24h, 7d, and 30d windows without changing the
source contract.

Verify:
`npm run build`
Expected: exit 0.

### Step 5: Surface the new fields in the feed UI

Update `OSINTFeedView` so the cards show:

- freshness
- evidence level
- topic tags
- content tags
- center-priority and review badges

Keep the current structure, but reduce the amount of copy per card.

Verify:
`npm run lint`
Expected: exit 0.

## Test plan

- Add `tests/news-collector.test.mjs` for dedupe, ranking, and fallback paths.
- Add a fixture that covers at least one center-first item, one trial item, one
  drug/target item, and one psychology/nutrition item.

## Done criteria

- [x] `npm run lint` exits 0.
- [x] `npm run build` exits 0.
- [x] `node tests/news-collector.test.mjs` exits 0.
- [x] `.env.example` documents `KNOWS_API_KEY` and `KNOWS_BASE_URL`.
- [x] The feed can represent the requested freshness windows and tag badges.
- [x] `docs/progress.md` and `docs/git-log.md` were updated.

## STOP conditions

- Stop if the KNOWS API shape is incompatible with the adapter contract and
  requires a different response model.
- Stop if the only way to make the feed work is to hardcode provider-specific
  rendering logic into `OSINTFeedView`.
- Stop if a dedupe rule would silently delete distinct source-backed items.

## Maintenance notes

- Keep the provider adapter boundary thin so a future `baseRul` integration can
  slot in without UI changes.
- The ranking rules should stay explicit; do not bury them in UI sort code.
- If the data source starts returning copyrighted full text, keep the storage
  layer metadata-only unless a separate policy decision is made.
