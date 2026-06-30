# Plan 004: Move the globe surface to a Three.js renderer

> **Executor instructions**: Follow the steps in order. Run every verification
> command and confirm the expected result before moving on. If any STOP
> condition happens, stop and report instead of improvising.
>
> **Drift check (run first)**:
> `git diff --stat 59bbaca..HEAD -- src/components/WarRoomGlobe.tsx src/components/ResourceMapView.tsx src/App.tsx src/types.ts src/lib docs/progress.md docs/git-log.md`

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: 001
- **Category**: tech-debt
- **Planned at**: commit `59bbaca`, 2026-06-26

## Why this matters

The repo already depends on `three`, but the current globe experience is still a
custom canvas/2D simulation. The product direction says the 3D Earth layer is a
core surface, and the reference principle is to keep the globe as the main
navigation view while Supabase remains the source of truth. This plan turns the
existing demo surface into a real Three.js implementation without changing the
app's overall layout.

## Current state

- `src/components/WarRoomGlobe.tsx:1-220` renders a canvas loop with custom
  projection logic and simulated logs; it does not import `three`.
- `src/components/ResourceMapView.tsx:1-260` already uses a portal and motion
  overlays for resource details, so it is the right place to keep the new globe
  as a stable navigation surface.
- `src/App.tsx:758-1091` still places the globe inside the current tab shell
  and wraps it in other sticky layers.
- `package.json:13-25` already includes `three`, so the plan is to use the
  installed dependency rather than add another renderer package.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run lint` | exit 0 |
| Build smoke | `npm run build` | exit 0 |
| Globe tests | `node tests/globe-renderer.test.mjs` | exit 0 |

## Scope

**In scope**

- `src/components/WarRoomGlobe.tsx`
- `src/components/ResourceMapView.tsx` if it needs to consume the new globe DTOs
- `src/types.ts`
- `src/lib/globe/*`
- `tests/globe-renderer.test.mjs`
- `docs/progress.md`
- `docs/git-log.md`

**Out of scope**

- The news pipeline
- AI Elements chat/config work
- The visual taste pass except what is needed to host the globe

## Steps

### Step 1: Define the globe DTO boundary

Create a small globe DTO module that consumes the stable resource and news
contracts from plan 001. It should describe renderable entities, camera
targets, and selected-region state without depending on the canvas internals.

Verify:
`node tests/globe-renderer.test.mjs`
Expected: fail until the DTO and renderer wrapper exist.

### Step 2: Replace the canvas loop with a Three.js scene

Rewrite `WarRoomGlobe` to use a Three.js scene, camera, controls, and clean
unmount logic. Keep the current content shape:

- hotspot markers
- country/city labels
- active stream logs
- center highlighting
- minimal interaction for selecting a region or center

Prefer simple primitives and instanced geometry over a heavy scene graph.

Verify:
`npm run lint`
Expected: exit 0.

### Step 3: Connect the scene to the resource/map surface

Adapt `ResourceMapView` so it can consume the new globe DTOs and keep the
detail drawer behavior intact. The user should still be able to select a
center, see source evidence, and inspect heat/read-model data.

Verify:
`npm run build`
Expected: exit 0.

### Step 4: Add scene lifecycle and smoke coverage

Add tests that prove the scene mounts, disposes, and rehydrates correctly when
the selected region or center changes. Verify the cleanup path so the renderer
does not leak WebGL resources when tabs switch.

Verify:
`node tests/globe-renderer.test.mjs`
Expected: exit 0.

## Test plan

- Add `tests/globe-renderer.test.mjs` to cover scene creation, selection state,
  and disposal.
- If the renderer uses helper modules, test the helper boundaries rather than
  the DOM structure only.

## Done criteria

- [x] `npm run lint` exits 0.
- [x] `npm run build` exits 0.
- [x] `node tests/globe-renderer.test.mjs` exits 0.
- [x] `WarRoomGlobe` uses Three.js primitives, not the old canvas loop.
- [x] `docs/progress.md` and `docs/git-log.md` were updated.

## STOP conditions

- Stop if the scene rewrite requires a new rendering dependency.
- Stop if the current map contract cannot preserve selection, source evidence,
  and center navigation.
- Stop if disposal or resize handling cannot be verified without browser-only
  manual guessing.

## Maintenance notes

- Keep the globe scene thin and driven by DTOs, not by feed parsing logic.
- The renderer should stay source-of-truth agnostic; Supabase and news records
  should remain upstream inputs.
- If later work introduces richer globe animation, keep it isolated from the
  selection and data-loading path.
