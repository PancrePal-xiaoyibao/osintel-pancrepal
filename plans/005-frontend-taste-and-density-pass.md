# Plan 005: Clean the frontend taste, density, and typography

> **Executor instructions**: Follow the steps in order. Run every verification
> command and confirm the expected result before moving on. If any STOP
> condition happens, stop and report instead of improvising.
>
> **Drift check (run first)**:
> `git diff --stat 59bbaca..HEAD -- src/App.tsx src/components/*.tsx src/index.css src/main.tsx package.json docs/progress.md docs/git-log.md`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 003, 004
- **Category**: tech-debt
- **Planned at**: commit `59bbaca`, 2026-06-26

## Why this matters

The overall structure is acceptable, but the current UI carries too much demo
weight: dense text blocks, repeated purple treatment, stacked surfaces, and a
general "AI demo" feel. The user specifically wants the `design-taste-frontend-v1`
direction, meaning the pass should prioritize calmer spacing, clearer hierarchy,
and a less noisy type/color system without flattening the app into a generic
dashboard.

## Current state

- `src/App.tsx:543-760` uses a very busy header/nav surface with multiple sticky
  layers and a strong purple accent.
- `src/components/OSINTChatView.tsx:576-897` and
  `src/components/AIElementsPlayground.tsx:456-1123` both use dense purple-heavy
  shells with long copy blocks and many inline panels.
- `src/components/WatchdogConsoleView.tsx:65-250` and
  `src/components/ReportsView.tsx:213-618` continue the same card-heavy visual
  language.
- `src/components/ResourceMapView.tsx:773-1326` already shows a cleaner portal
  pattern that can serve as a style reference for calmer overlays.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run lint` | exit 0 |
| Build smoke | `npm run build` | exit 0 |
| Visual regression smoke | `npm run dev` | app starts without runtime errors |

## Scope

**In scope**

- `src/index.css`
- `src/App.tsx`
- `src/components/OSINTFeedView.tsx`
- `src/components/OSINTChatView.tsx`
- `src/components/AIElementsPlayground.tsx`
- `src/components/ResourceMapView.tsx`
- `src/components/WatchdogConsoleView.tsx`
- `src/components/ReportsView.tsx`
- `src/components/HelpView.tsx`
- `src/components/UserAuth.tsx`
- `docs/progress.md`
- `docs/git-log.md`

**Out of scope**

- News ingestion semantics
- Supabase schemas
- The Three.js scene logic except for surface styling needed by the shell

## Steps

### Step 1: Lock the design language to the v1 taste rules

Apply the `design-taste-frontend-v1` constraints to the shared shell:

- reduce the purple/blue bias
- use calmer neutral surfaces
- lower copy density in panels
- prefer fewer, clearer hierarchy levels
- keep the current product structure, but make it breathe

Use the repo's existing shell patterns as the base and avoid introducing a new
design system.

Verify:
`npm run lint`
Expected: exit 0.

### Step 2: Normalize typography and spacing primitives

Adjust the shared typography scale and spacing tokens in `src/index.css` and
the major shell components so that headings, body copy, labels, and helper text
follow a consistent rhythm. Remove gratuitous text blocks where a short label
or badge will do.

Verify:
`npm run build`
Expected: exit 0.

### Step 3: Compress the busy panels

Refine the largest shells:

- reduce the number of border layers
- trim repeated explanatory copy
- replace overloaded card stacks with grouped sections or dividers
- keep the meaningful badges, evidence labels, and summary rows

The chat and provider panels should feel lighter, not simpler in capability.

Verify:
`npm run lint`
Expected: exit 0.

### Step 4: Tighten the main navigation and header hierarchy

Make the header, nav, and main tab surface read as one system instead of three
competing rows. Preserve the actions, but reduce visual collision and use the
space more intentionally.

Verify:
`npm run dev`
Expected: the app opens and the top-level shell renders without clipped content.

## Test plan

- No new automated logic is required for the taste pass, but the executor must
  smoke the app in the browser after the build.
- If the executor introduces any helper for shared shell spacing or typography,
  cover it with a small unit test instead of relying on screenshots only.

## Done criteria

- [ ] `npm run lint` exits 0.
- [ ] `npm run build` exits 0.
- [ ] `npm run dev` starts and the shell renders without visible header/nav
  collisions.
- [ ] The UI uses a calmer, less purple-heavy palette and reduced text density.
- [ ] `docs/progress.md` and `docs/git-log.md` were updated.

## STOP conditions

- Stop if the style pass would require a full design-system rewrite.
- Stop if the v1 taste rules conflict with a critical accessibility requirement.
- Stop if a component's structure must change so much that it belongs in a
  structural refactor plan instead.

## Maintenance notes

- Keep the palette changes centralized where possible so future screens inherit
  the calmer tone automatically.
- Do not convert the app into a generic light-theme SaaS shell; preserve the
  domain-specific atlas feel.
- If new dense content is added later, it should reuse these spacing rules
  rather than recreating the old visual clutter.

