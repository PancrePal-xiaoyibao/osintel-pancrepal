# Plan 006: Fix overlay stacking and floating menu collisions

> **Executor instructions**: Follow the steps in order. Run every verification
> command and confirm the expected result before moving on. If any STOP
> condition happens, stop and report instead of improvising.
>
> **Drift check (run first)**:
> `git diff --stat 59bbaca..HEAD -- src/App.tsx src/components/OSINTChatView.tsx src/components/AIElementsPlayground.tsx src/components/ManualSubmissionView.tsx src/components/ResourceMapView.tsx src/components/UserAuth.tsx docs/progress.md docs/git-log.md`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: 005
- **Category**: bug
- **Planned at**: commit `59bbaca`, 2026-06-26

## Why this matters

The home screen currently has competing fixed and sticky layers: the global
header, the secondary nav, floating action buttons, modal trays, and overlay
panels. Some page regions can cover or block the floating entry points, and the
stacking order is inconsistent across the app. This plan fixes the layer system
so the chat, config, and submission affordances remain usable on every page.

## Current state

- `src/App.tsx:555-759` creates a sticky header and a sticky sub-nav.
- `src/App.tsx:1043-1091` renders the ops overlay tray at `z-50`.
- `src/App.tsx:1117-1198` renders the two floating action buttons and the major
  modals, including the AI Elements modal at `z-[100]` and the config modal at
  `z-50`.
- `src/components/OSINTChatView.tsx:577-897` uses a full-screen fixed overlay
  with its own internal layers and a popup attachment menu.
- `src/components/AIElementsPlayground.tsx:456-956` also uses full-screen fixed
  overlays and internal popups.
- `src/components/ResourceMapView.tsx:1309-1326` already uses an explicit
  high-z portal pattern for its drawer, which should be used as the stable
  reference.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run lint` | exit 0 |
| Build smoke | `npm run build` | exit 0 |
| Browser smoke | `npm run dev` | app starts and overlays remain reachable |

## Scope

**In scope**

- `src/App.tsx`
- `src/components/OSINTChatView.tsx`
- `src/components/AIElementsPlayground.tsx`
- `src/components/ManualSubmissionView.tsx`
- `src/components/ResourceMapView.tsx`
- `src/components/UserAuth.tsx` if its dropdown layers conflict with the shell
- `docs/progress.md`
- `docs/git-log.md`

**Out of scope**

- News semantics
- Schema changes
- Taste/typography changes beyond what is needed to solve the overlap bug

## Steps

### Step 1: Inventory the layer stack and assign explicit tiers

Create or update a small layer map in the app shell so the layout has named
tier values for:

- base content
- sticky nav
- floating actions
- drawers
- modals
- temporary dropdowns/tooltips

Stop relying on scattered hardcoded `z-50` values.

Verify:
`npm run lint`
Expected: exit 0.

### Step 2: Normalize the dropdown and floating entry points

Adjust the language/config/help/chat/submission entry points so they do not
hide behind sticky page regions. The floating buttons should remain visible and
clickable, and their popovers should anchor to the correct tier.

Verify:
`npm run dev`
Expected: the floating buttons remain clickable on the home screen and do not
cover content unexpectedly.

### Step 3: Make the overlay roots consistent

Align the modal roots for the chat, AI Elements, config, and manual submission
surfaces so each uses the same backdrop strategy and closes on backdrop click
where appropriate. Keep the drawer behavior, but ensure it does not get buried
under the header or nav.

Verify:
`npm run build`
Expected: exit 0.

### Step 4: Add a regression test or smoke note

Add a small smoke check for the chosen layer map, or if the repo has no test
pattern for this, record a manual browser smoke in the docs and keep the test
boundary explicit.

Verify:
`npm run lint`
Expected: exit 0.

## Test plan

- If a helper is introduced for layer tiers, test the tier constants and the
  exported class names or inline style map.
- If no helper is introduced, rely on a documented browser smoke plus the build
  check.

## Done criteria

- [x] `npm run lint` exits 0.
- [x] `npm run build` exits 0.
- [x] `npm run dev` shows floating buttons and modals without stacking bugs.
- [x] The main header/nav do not block the overlay entry points.
- [x] `docs/progress.md` and `docs/git-log.md` were updated.

## STOP conditions

- Stop if fixing the stack requires a broad rewrite of every overlay component.
- Stop if a modal or drawer must intentionally remain behind a sticky surface
  for a documented UX reason.
- Stop if the team decides to change the shell structure instead of solving the
  layer map directly.

## Maintenance notes

- Keep the tier names centralized so future overlays can reuse the same map.
- New floating controls should use the same portal/layer rules from the start.
- Re-check stacking whenever a new sticky header or drawer is introduced.
