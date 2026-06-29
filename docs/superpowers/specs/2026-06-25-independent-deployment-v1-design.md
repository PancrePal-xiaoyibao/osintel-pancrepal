# Independent Deployment v1 Design

## Background
The current repository is an AI Studio demo with a working Vite + React front end and an Express `server.ts` entry point. The goal of this phase is not to redesign the app, but to turn the existing demo into a single-server system that can be deployed, restored, and recopied on a VPS with minimal manual steps.

## Goal
Build a first independent deployment version that runs as one process on one VPS, uses Supabase as the only remote data layer, and preserves the current demo structure in `src/` and `server.ts`.

## Deployment Model
- One VPS, one Node process, one Supabase project.
- Local configuration lives in `.env`; required keys are documented in `.env.example`.
- Startup flow: install dependencies, validate environment, build, start, then probe `/api/health`.
- Recovery flow: rollback to the last stable git commit, rerun startup checks, and restart the service.

## Supabase Schema Boundary
Keep the first schema small and directly mapped to current UI state:
- `osint_items` for feed cards and source-backed intelligence items.
- `resource_centers` for globe/resource-map center records.
- `patient_profiles` for the personalized profile block.
- `watchdog_events` for repair logs, errors, and recovery history.
- `system_reports` for the 15-day summary/report output.
- `app_settings` for provider, language, and deployment configuration that should survive restarts.

Schema rules:
- Store only fields that the current UI can read or the deployment process needs to restore.
- Preserve source URL, evidence level, and data quality metadata where present.
- Treat derived scores and summaries as read models, not authoritative records.

## What Stays Unchanged
- The demo keeps its current module layout.
- `server.ts` remains the single backend entry point.
- Supabase replaces ad hoc persistence only where state needs to survive restarts.
- The 3D globe and AI Elements remain the main UI and interaction surfaces.

## Non-Goals
- No container orchestration.
- No multi-service split.
- No plugin marketplace.
- No full rebuild of the front-end architecture.

## Acceptance Criteria
- A new VPS can be initialized from docs and `.env.example` alone.
- The app builds and starts from git without hidden manual setup.
- A health probe confirms the service is alive after boot.
- Supabase tables cover the first deployment’s persistent state without schema sprawl.
- The system can be copied to another server by repeating the documented steps.
