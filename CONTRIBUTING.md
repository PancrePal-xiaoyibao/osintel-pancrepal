# Contributing to PancrePal OSINT Hub

Thank you for considering a contribution! This is a community-driven open-source project
for pancreatic-cancer patients and families. Quality and safety matter more than speed —
**this is a medical-adjacent product, so the bar for production code is high.**

## Repository etiquette

- **Never push directly to `main`.** Open a PR from a feature branch
  (`feat/...`, `fix/...`, `docs/...`).
- **One concern per PR.** Easier to review, easier to revert.
- **Branch protection is on.** `main` requires a passing CI check + 1 review.
- **Sign your commits** if you can (`git commit -S`); we don't enforce it yet but it's good practice.

## Checkfix closure (mandatory for code changes)

Every PR that touches TypeScript or component logic must run, in order, and all must pass:

```bash
npm run lint           # tsc --noEmit — type-check
npm test               # node --test tests/ — all contract tests
npm run build          # vite build + esbuild server bundle
```

If you add new behavior, add a contract test under `tests/<name>.test.mjs`.

## Completion definition (mark in your PR description)

| Symbol | Meaning |
|---|---|
| ✅ | Implemented & verified |
| 🔧 | Partial / needs follow-up (open a follow-up issue) |
| ⭐ | Extra credit |
| ⏳ | Deferred (out of scope; note in issue) |

We do not accept stub/mock/virtual implementations as "done". A feature is ✅ only when:
- real upstream data or a configured model drives it, OR
- it explicitly reports `mode: unavailable` / `mode: demo_only` per the runtime mode contract
  in [docs/process/mock-audit.md](./docs/process/mock-audit.md).

## Anti dry-run checklist

Before marking a task done, confirm:

1. **Real data path**: hit a live API / DB / model end-to-end at least once.
2. **Error path**: trigger the failure mode and confirm the user sees a clear message.
3. **Persistence**: data survives a process restart (kill -9, then boot).
4. **No new mock**: no synthetic medical content (fake NCT/PMID, templated A-grade evidence)
   in the production feed/chat state.
5. **Logs**: structured logs (pino) appear for the new code path; no `console.log`.

## Medical safety contract

If your PR touches anything a patient sees (feed, AI summary, hospital info):

- No fabricated medical claims. AI summaries must trace to a real source URL.
- Preserve the disclaimer banner ("not clinical advice").
- New evidence levels (`A`/`B`/`C`/`D`) must cite the source.
- AI-generated content should be watermarked (EU AI Act Art. 50; China GenAI §12).

## Environment

- Node 22+ required (Node 24 recommended; `node:sqlite` needs 22.5+).
- All keys are optional — the app degrades gracefully with `mode: unavailable`.
- See [quickstart.md](./quickstart.md) for local setup.

## Commit message convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

`type`: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.
`scope`: optional module name (`security`, `frontend`, `db`, `news`, ...).

Examples:
- `feat(security): add rate-limit on auth endpoints`
- `fix(news): drop synthetic fallback items in production`
- `docs: deployment guide for Docker + Caddy`

End commits with `Co-Authored-By: ...` if applicable.

## Updating docs

For non-trivial changes, update:

- [docs/process/progress.md](./docs/process/progress.md) — what landed
- [docs/process/decision-log.md](./docs/process/decision-log.md) — why, if a design call changed
- [docs/process/handoff.md](./docs/process/handoff.md) — gotchas for the next contributor

## License

By contributing you agree your contributions are licensed under [Apache-2.0](./LICENSE).
