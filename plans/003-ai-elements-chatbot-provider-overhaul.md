# Plan 003: Rework AI Elements chat and provider configuration

> **Executor instructions**: Follow the steps in order. Run every verification
> command and confirm the expected result before moving on. If any STOP
> condition happens, stop and report instead of improvising.
>
> **Drift check (run first)**:
> `git diff --stat 59bbaca..HEAD -- src/App.tsx src/components/OSINTChatView.tsx src/components/AIElementsPlayground.tsx src/components/UserAuth.tsx src/lib server.ts .env.example docs/progress.md docs/git-log.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `59bbaca`, 2026-06-26

## Why this matters

The current chatbot and provider UI are a simulated proof-of-concept. They
already expose some of the right ideas - thinking, citations, attachments, and
model selection - but the behavior is still hand-rolled and the UI is too dense.
This plan turns that surface into a thin wrapper around a real AI Elements
pattern, with save/export/history and provider config that can grow beyond the
current demo defaults.

## Current state

- `src/components/OSINTChatView.tsx:72-897` keeps the whole chat experience in
  one component, including simulated reasoning, citations, attachments, and the
  `/api/osint/chat-custom` call.
- `src/components/AIElementsPlayground.tsx:126-1123` is a long mock sandbox with
  provider cards, model settings, and code samples, but it still uses local
  state and localStorage as the source of truth.
- `src/App.tsx:111-279` stores provider settings in localStorage keys like
  `pancreas_ai_elements_configs` and `pancreas_ai_elements_active_provider`.
- `.env.example:1-9` does not yet document the extra provider keys this surface
  needs.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run lint` | exit 0 |
| Build smoke | `npm run build` | exit 0 |
| UI contract tests | `node tests/ai-elements-contract.test.mjs` | exit 0 |

## Scope

**In scope**

- `src/components/OSINTChatView.tsx`
- `src/components/AIElementsPlayground.tsx`
- `src/App.tsx`
- `src/lib/llm-providers.ts`
- `server.ts` if a provider router or export endpoint is needed
- `.env.example`
- `tests/ai-elements-contract.test.mjs`
- `docs/progress.md`
- `docs/git-log.md`

**Out of scope**

- The news collector
- Supabase schema work
- The Three.js globe refactor

## Steps

### Step 1: Extract the provider registry and persisted settings shape

Create a single provider registry module that defines:

- provider id
- display name
- base URL
- default model list
- credential field names
- any provider-specific model aliases

Keep backward compatibility with the existing localStorage keys, but stop
duplicating the provider list in multiple components.

Verify:
`node tests/ai-elements-contract.test.mjs`
Expected: fail until the registry is wired in.

### Step 2: Convert the chat shell into a real AI Elements wrapper

Refactor `OSINTChatView` so the message list, reasoning block, citations, and
composer are composed from AI Elements-style primitives instead of bespoke UI
branches. Keep these capabilities:

- thinking / reasoning disclosure
- attachment chips
- history retention
- export or save action
- model selection
- fallback simulation only when the provider is unavailable

The goal is to make the chat feel like a maintained product, not a demo widget.

Verify:
`npm run lint`
Expected: exit 0.

### Step 3: Refactor the configuration playground

Turn `AIElementsPlayground` into the same provider registry UI, not a second
copy of the settings system. It should configure the full provider list and
show the active provider, model, and connection state in a compact way.

If the implementation needs to introduce real AI Elements components, do that
here rather than hardcoding more mock markdown examples.

Verify:
`npm run build`
Expected: exit 0.

### Step 4: Add persistence and export affordances

Wire a save/export/history path that can persist conversations locally now and
leave a clean surface for Supabase persistence later. The user-visible behavior
should be:

- conversation history can be cleared, saved, and exported
- reasoning can be collapsed or expanded
- the active model is visible
- the config panel reflects the same provider state as the chat

Verify:
`node tests/ai-elements-contract.test.mjs`
Expected: exit 0.

## Test plan

- Add `tests/ai-elements-contract.test.mjs` to validate the provider registry,
  the persisted settings shape, and the public payload used by `/api/osint/chat-custom`.
- Keep the tests narrow: they should assert contracts, not UI snapshots.

## Done criteria

- [ ] `npm run lint` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `node tests/ai-elements-contract.test.mjs` exits 0.
- [ ] Provider selection is driven by one registry module.
- [ ] Chat can show thinking, citations, attachments, history, and export/save
  affordances.
- [ ] `docs/progress.md` and `docs/git-log.md` were updated.

## STOP conditions

- Stop if the AI Elements component API you choose cannot support reasoning,
  citations, and attachments without inventing a parallel abstraction.
- Stop if migrating the provider config would silently break the existing
  localStorage keys.
- Stop if the implementation would need to duplicate the provider registry in
  both the chat and playground components.

## Maintenance notes

- Keep `OSINTChatView` thin; the registry and persistence logic should live in
  shared modules.
- Do not reintroduce purple-heavy demo copy once the AI Elements shell is in
  place.
- If Supabase persistence for chat history is added later, wire it into the same
  contract instead of creating a separate history format.

