<!--
  Thanks for contributing to PancrePal OSINT Hub!
  Fill in the sections below. Keep it focused — one concern per PR.
-->

## What & why

<!-- One-paragraph summary. Link the issue: Closes #NNN. -->

## Changes

<!-- Bullet list of what changed. Mention files / modules. -->

-
-

## Verification

<!-- Commands you ran and their results. Checkfix closure is mandatory. -->

- [ ] `npm run lint` passes
- [ ] `npm test` passes (all `tests/*.test.mjs`)
- [ ] `npm run build` succeeds
- [ ] Manual smoke (if UI/route change): describe what you tested
- [ ] Updated docs (`docs/process/progress.md`, `docs/process/decision-log.md`) for non-trivial changes

## Completion definition

Mark the appropriate status per task in the PR:
- ✅ Implemented & verified
- 🔧 Partial / needs follow-up (open a follow-up issue)
- ⭐ Extra credit
- ⏳ Deferred (out of scope; noted in issue)

## Risk & rollback

<!-- What could break? How do we roll back (revert commit / Docker tag / DB migration)? -->

## Medical disclaimer

If this PR touches any content the patient sees (feed, AI summary, center info), confirm:
- [ ] No new synthetic medical content is added to production feed/chat state
- [ ] AI output is clearly labelled; zero-hallucination verifier still applies
- [ ] Disclaimer "not clinical advice" is preserved in the UI
