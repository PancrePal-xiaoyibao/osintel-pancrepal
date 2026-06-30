# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite + React + TypeScript app. Main application code lives in `src/`, with UI components in `src/components/`, shared logic in `src/lib/`, Firebase helpers in `src/firebase.ts`, and seed data in `src/seed-data.ts`. Global styles are in `src/index.css`. The app also includes `server.ts` for the local Node entry point and supporting config in `vite.config.ts` and `tsconfig.json`.

The unified search module in `src/lib/search/` provides a pluggable provider registry (13 providers: KnowS, PubMed, ClinicalTrials.gov, AnySearch, Tavily, Serper, Google CSE, Metaso, Brave, Exa, Semantic Scholar, OpenAlex) with parallel execution, circuit breaking, and caching.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start the local app with `tsx server.ts`.
- `npm run build`: create the production Vite bundle and server bundle.
- `npm start`: run the built server from `dist/server.cjs`.
- `npm run lint`: run TypeScript type-checking with `tsc --noEmit`.

## Coding Style & Naming Conventions
Use TypeScript with React function components and hooks. Follow the existing style: 2-space indentation, single-purpose components, and descriptive camelCase names for variables and functions. Keep component filenames in `PascalCase.tsx` and helper modules in `camelCase.ts`. Prefer local, explicit state over hidden cross-file coupling.

## Architecture Notes
The product direction is fixed around three core stacks: a 3D Earth/globe experience powered by Three.js, AI chat and assistant UI built with `ai-elements`, and backend/data modeling aligned to Supabase schemas. When adding features, keep the UI flow consistent with these choices and update schema-related types together with app code.

## Testing Guidelines
There is no dedicated test runner configured yet. Use `npm run lint` as the baseline verification command, and add tests alongside new behavior when a test framework is introduced. If you add tests, keep names descriptive and colocated with the code they cover.

## Security & Configuration Tips
Never commit secrets. Local overrides belong in `.env.local`; keep `.env.example` in sync with required keys. Treat Firebase, Gemini, and Supabase credentials as environment-only values.

## Commit & Pull Request Guidelines
This repo does not yet have a long git history, so use short imperative commit messages such as `Add globe view docs` or `Align Supabase schema`. Pull requests should summarize the change, mention verification commands, and include screenshots for UI changes.

## Documentation & Records
Keep project decisions and progress in `docs/`. Update `docs/process/decision-log.md`, `docs/process/progress.md`, `docs/process/handoff.md`, and `docs/process/git-log.md` when you make meaningful changes so future contributors can recover context quickly. Design and reference material lives in `docs/design/`; specs and runbooks in `docs/superpowers/`.
