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
assert.equal(result.rollbackRequired, false);

const failed = await runUpdate({
  currentCommit: 'abc123',
  nextCommit: 'def456',
  build: async () => ({ ok: false }),
  smokeTest: async () => ({ ok: true }),
  rollback: async () => undefined,
});

assert.equal(failed.ok, false);
assert.equal(failed.rollbackRequired, true);
