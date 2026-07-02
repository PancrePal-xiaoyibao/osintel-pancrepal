# Handoff

- Review `AGENTS.md` before making changes.
- Update the decision and progress logs when product direction or implementation constraints change.
- Keep the `KNOWS_API_KEY` and `KNOWS_BASE_URL` entries in `.env.example` aligned with the news pipeline whenever the evidence endpoint changes.
- The current UI direction is intentionally calmer: slate/zinc surfaces, reduced neon emphasis, and preserved AI chat/history/export behavior.
- Issue #10 introduced an explicit runtime mode contract. Treat `real` as production data/model output, `graceful_fallback` as deterministic extraction/cached data, `demo_only` as excluded from production readiness, and `unavailable` as no safe output. Do not reintroduce synthetic medical answers or random NCT/news records into production feed/chat state.
