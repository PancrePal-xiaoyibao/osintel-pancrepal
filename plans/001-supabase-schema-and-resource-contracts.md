# Plan 001: Align Supabase schema with hospital, news, and resource contracts

> **Executor instructions**: Follow the steps in order. Run every verification
> command and confirm the expected result before moving on. If any STOP
> condition happens, stop and report instead of improvising.
>
> **Drift check (run first)**:
> `git diff --stat 59bbaca..HEAD -- supabase src/types.ts src/seed-data.ts docs/decision-log.md docs/progress.md docs/git-log.md docs/supabase-city-resource-layer.md docs/news-review-promotion-workflow.md schema设计.md`
> If any in-scope file changed since this plan was written, compare the current
> code against the excerpts below before editing.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `59bbaca`, 2026-06-26

## Why this matters

The repo currently keeps feed rows and resource centers in seed data, which is
fine for the demo but not for a self-maintained product. The pposintel docs
already define the durable boundary: source-managed news tables, review-gated
promotion, and a city/hospital resource layer that separates public signal from
clinical fact. This plan creates the schema contract the rest of the work can
rely on.

## Current state

- `src/types.ts:1-33` defines simplified `OSINTItem`, `WatchdogStatus`,
  `ResourceCenter`, `SystemReport15Day`, and `PatientProfile` shapes.
- `src/seed-data.ts:1-140` hardcodes the first feed and resource centers in
  TypeScript instead of loading a database-backed model.
- `docs/supabase-city-resource-layer.md:9-94` already specifies
  `hospital_departments`, `department_public_accounts`, `resource_heat_snapshots`,
  and `resource_source_links`.
- `docs/data-model.md:45-75` and
  `docs/news-review-promotion-workflow.md:11-68` define the news triage,
  review, and promotion boundary.
- `src/App.tsx:172-279` still loads provider/profile state from localStorage
  and has no Supabase-backed app settings contract yet.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run lint` | exit 0 |
| Build smoke | `npm run build` | exit 0 |
| Contract tests | `node tests/schema-contracts.test.mjs` | exit 0 |

## Scope

**In scope**

- `supabase/migrations/011_city_resource_schema.sql`
- `supabase/migrations/012_news_pipeline_schema.sql`
- `src/lib/schema-contracts.ts`
- `tests/schema-contracts.test.mjs`
- `docs/progress.md`
- `docs/git-log.md`
- `docs/decision-log.md` only if the contract changes the documented product
  boundary

**Out of scope**

- `src/components/*` UI refactors
- News ingestion logic
- LLM provider routing
- Any destructive data migration against a live database

## Steps

### Step 1: Define shared schema contracts first

Create a small TypeScript module that exports the canonical table and DTO names
for the new schema. Include the resource hierarchy keys from the docs:
`region`, `country`, `city`, `treatment_center`, `hospital_department`,
`department_public_account`, `wechat_article`, `resource_heat_snapshot`,
`news_source_registry`, `news_source_collection`, `news_collection_run`,
`news_normalized_item`, `news_review_action`, and `app_setting`.

Verify:
`node tests/schema-contracts.test.mjs`
Expected: the test fails until the SQL files exist.

### Step 2: Write the migrations

Add the new Supabase migrations with:

- RLS enabled on every public read model.
- Source metadata fields kept separate from rendered scores.
- News review states and promotion traceability.
- Resource heat as public signal only, not as clinical quality.

Use the pposintel naming from the docs instead of inventing a new vocabulary.

Verify:
`npm run lint`
Expected: exit 0.

### Step 3: Add a contract test for table names and guard rails

Create `tests/schema-contracts.test.mjs` that reads the SQL files and checks for
the required table names, review-state columns, and source-link columns. Also
assert that the public signal fields are labeled as signal/heat, not treatment
quality or patient volume.

Verify:
`node tests/schema-contracts.test.mjs`
Expected: exit 0.

### Step 4: Record the decision trail

Append short notes to `docs/progress.md` and `docs/git-log.md` describing the
schema contracts that were added and why they matter for the later news and UI
plans.

Verify:
`git diff --stat`
Expected: only the intended docs and schema files changed.

## Test plan

- `tests/schema-contracts.test.mjs` should cover the exact table names and the
  required source-review columns.
- If the executor adds helper functions in `src/lib/schema-contracts.ts`, test
  those helpers directly rather than only testing the SQL text.

## Done criteria

- [ ] `npm run lint` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `node tests/schema-contracts.test.mjs` exits 0.
- [ ] The migration files define the pposintel-compatible resource and news
  contracts.
- [ ] `docs/progress.md` and `docs/git-log.md` were updated.

## STOP conditions

- Stop if a required table or column already exists with a conflicting meaning.
- Stop if the implementation would need to delete or rewrite existing data
  outside the repo.
- Stop if the docs and the live code disagree on the news promotion boundary.

## Maintenance notes

- Future news work will depend on these table names, so do not rename them
  casually.
- Keep public signal fields separate from verified clinical facts.
- If the next round adds Supabase auth or row-level ownership, revisit RLS
  policies instead of layering client-side checks on top.

