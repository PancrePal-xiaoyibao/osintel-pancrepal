# Autonomous Basis Runbook

## Bootstrap
- Copy `.env.example` to `.env`.
- Set `GEMINI_API_KEY` and `APP_URL`.
- Run `npm install`.

## Verify
- Run `node tests/startup-check.test.mjs`.
- Run `node tests/health-check.test.mjs`.
- Run `node tests/update-runner.test.mjs`.
- Run `npm run dev` and open `GET /api/health`.

## Update
- Pull the next commit.
- Run the build and the smoke tests.
- If either fails, trigger rollback to the last stable commit.

## Recover
- Restore the previous stable commit.
- Rerun the startup check and health probe.

