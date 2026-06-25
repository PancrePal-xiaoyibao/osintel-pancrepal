# AI Studio Demo Autonomous Basis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current AI Studio demo into a maintainable single-instance product with a minimal autonomy layer for startup checks, health checks, git-driven updates, and rollback.

**Architecture:** Keep the app as a single Vite + React + Express deployment. Add a small operational layer for environment validation, runtime health checking, and update/rollback workflows without introducing multi-service orchestration. Preserve the existing UI prototype while making configuration, recovery, and future replication explicit and testable.

**Tech Stack:** TypeScript, Vite, React 19, Express, `dotenv`, Supabase read models/config, Gemini API via `@google/genai`, local filesystem scripts, Git.

## Global Constraints

- 保持单体应用形态，不提前引入多服务编排。
- Supabase 只承担配置和读模型，不把 demo 改造成重后端平台。
- `.env` 作为统一配置入口，LLM 与 Supabase 都必须可替换、可恢复。
- 自治优先级高于扩展性：先保证能活，再保证能复制。
- 当前仓库是 Vite 项目，配置和运行方式必须兼容 `server.ts` + `npm run dev`。
- 当前 AI Studio 约定的环境变量名保持为 `GEMINI_API_KEY` 和 `APP_URL`。

---

### Task 1: Add an operations contract and baseline checks

**Files:**
- Create: `src/lib/operations-contract.ts`
- Create: `src/lib/startup-check.ts`
- Test: `tests/startup-check.test.mjs`

**Interfaces:**
- Consumes: `process.env`, filesystem path checks, and a small typed result shape.
- Produces: `runStartupCheck()` returning `{ ok: boolean; issues: string[] }`.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { runStartupCheck } from '../src/lib/startup-check.ts';

const result = await runStartupCheck({
  env: { GEMINI_API_KEY: 'x', APP_URL: 'https://example.com' },
  requiredFiles: ['package.json', 'server.ts', '.env.example'],
  fileExists: async () => true,
});

assert.equal(result.ok, true);
assert.deepEqual(result.issues, []);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/startup-check.test.mjs`
Expected: FAIL because `runStartupCheck` is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function runStartupCheck(input: {
  env: Record<string, string | undefined>;
  requiredFiles: string[];
  fileExists: (path: string) => Promise<boolean>;
}) {
  const issues: string[] = [];
  if (!input.env.GEMINI_API_KEY) issues.push('missing GEMINI_API_KEY');
  if (!input.env.APP_URL) issues.push('missing APP_URL');
  for (const file of input.requiredFiles) {
    if (!(await input.fileExists(file))) issues.push(`missing file: ${file}`);
  }
  return { ok: issues.length === 0, issues };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/startup-check.test.mjs`
Expected: PASS with `ok: true`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/operations-contract.ts src/lib/startup-check.ts tests/startup-check.test.mjs
git commit -m "feat: add startup check contract"
```

### Task 2: Add a runtime health endpoint and health probe

**Files:**
- Modify: `server.ts`
- Create: `src/lib/health-check.ts`
- Test: `tests/health-check.test.mjs`

**Interfaces:**
- Consumes: `watchdogStatus`, app readiness, and the startup check output.
- Produces: `GET /api/health` with a small JSON payload and `runHealthCheck()`.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { runHealthCheck } from '../src/lib/health-check.ts';

const result = runHealthCheck({
  startupOk: true,
  appReady: true,
  dbReady: true,
});

assert.equal(result.ok, true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/health-check.test.mjs`
Expected: FAIL because `runHealthCheck` is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function runHealthCheck(input: { startupOk: boolean; appReady: boolean; dbReady: boolean }) {
  const ok = input.startupOk && input.appReady && input.dbReady;
  return { ok, checks: input };
}
```

- [ ] **Step 4: Add the API route**

```ts
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', data: runHealthCheck({ startupOk: true, appReady: true, dbReady: true }) });
});
```

- [ ] **Step 5: Run test and smoke the route**

Run:
`node tests/health-check.test.mjs`
`npm run dev`

Expected:
- Unit test passes.
- `GET /api/health` returns JSON with `ok: true`.

- [ ] **Step 6: Commit**

```bash
git add server.ts src/lib/health-check.ts tests/health-check.test.mjs
git commit -m "feat: add health probe"
```

### Task 3: Add update orchestration with git-driven rollback metadata

**Files:**
- Create: `src/lib/update-runner.ts`
- Create: `src/lib/rollback-state.ts`
- Create: `scripts/update-app.mjs`
- Test: `tests/update-runner.test.mjs`

**Interfaces:**
- Consumes: git commit hashes, a build command, and a health check command.
- Produces: `runUpdate()` that returns `success | rollbackRequired`.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { runUpdate } from '../src/lib/update-runner.ts';

const result = await runUpdate({
  currentCommit: 'abc123',
  nextCommit: 'def456',
  build: async () => ({ ok: true }),
  smokeTest: async () => ({ ok: true }),
  rollback: async () => undefined,
});

assert.equal(result.ok, true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/update-runner.test.mjs`
Expected: FAIL because `runUpdate` is not implemented yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export async function runUpdate(input: {
  currentCommit: string;
  nextCommit: string;
  build: () => Promise<{ ok: boolean }>;
  smokeTest: () => Promise<{ ok: boolean }>;
  rollback: () => Promise<void>;
}) {
  const buildResult = await input.build();
  const smokeResult = buildResult.ok ? await input.smokeTest() : { ok: false };
  if (!buildResult.ok || !smokeResult.ok) {
    await input.rollback();
    return { ok: false, rollbackRequired: true as const };
  }
  return { ok: true, rollbackRequired: false as const };
}
```

- [ ] **Step 4: Add the script wrapper**

```js
import { runUpdate } from '../src/lib/update-runner.ts';
console.log(await runUpdate(/* wire concrete commands in implementation */));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/update-runner.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/update-runner.ts src/lib/rollback-state.ts scripts/update-app.mjs tests/update-runner.test.mjs
git commit -m "feat: add git-driven update runner"
```

### Task 4: Persist docs and operational notes for future replication

**Files:**
- Modify: `docs/decision-log.md`
- Modify: `docs/progress.md`
- Modify: `docs/handoff.md`
- Modify: `docs/git-log.md`
- Create: `docs/superpowers/runbooks/autonomous-basis.md`

**Interfaces:**
- Consumes: the implemented check/update flow and commit history.
- Produces: a runbook that explains how to bootstrap, verify, update, and roll back the app on a new server.

- [ ] **Step 1: Write the doc changes**

Add one short entry each to `docs/decision-log.md`, `docs/progress.md`, and `docs/git-log.md` describing the autonomy layer and its commit history.

- [ ] **Step 2: Write the runbook**

```md
# Autonomous Basis Runbook

## Bootstrap
- Copy `.env.example` to `.env`.
- Set `GEMINI_API_KEY` and `APP_URL`.
- Install dependencies with `npm install`.

## Verify
- Run the startup check.
- Run the health probe.

## Update
- Pull the next commit.
- Run build and smoke tests.
- Roll back on failure.

## Recover
- Restore the previous commit and rerun startup checks.
```

- [ ] **Step 3: Validate the docs are specific**

Run: `sed -n '1,220p' docs/superpowers/runbooks/autonomous-basis.md`
Expected: The runbook names the exact bootstrap, verify, update, and recover steps.

- [ ] **Step 4: Commit**

```bash
git add docs/decision-log.md docs/progress.md docs/handoff.md docs/git-log.md docs/superpowers/runbooks/autonomous-basis.md
git commit -m "docs: record autonomous basis runbook"
```

### Task 5: Wire the existing app to the operational layer

**Files:**
- Modify: `server.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/HelpView.tsx`

**Interfaces:**
- Consumes: `runStartupCheck`, `runHealthCheck`, and the update metadata.
- Produces: a visible status panel in the app and a clean startup failure path.

- [ ] **Step 1: Write the failing integration test or smoke check**

Use the app’s existing dev flow and assert that the status panel renders the latest check states.

- [ ] **Step 2: Implement the UI hook-up**

Show runtime status in the app shell, keep it read-only, and do not mix it with product data entry.

- [ ] **Step 3: Verify on the running app**

Run: `npm run dev`
Expected: app starts, status panel renders, and health endpoint responds.

- [ ] **Step 4: Commit**

```bash
git add server.ts src/App.tsx src/components/HelpView.tsx
git commit -m "feat: surface runtime status in app"
```

## Validation Checklist
- `npm run lint`
- `npm run build`
- `node tests/startup-check.test.mjs`
- `node tests/health-check.test.mjs`
- `node tests/update-runner.test.mjs`
- `npm run dev` and `GET /api/health`

## Scope Notes
- Do not add container orchestration.
- Do not add a plugin marketplace.
- Do not expand into a full self-replication controller in this plan.
- Keep Supabase usage minimal and compatible with the existing AI Studio demo setup.
