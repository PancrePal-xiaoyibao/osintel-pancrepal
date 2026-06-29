import assert from 'node:assert/strict';
import { runHealthCheck } from '../src/lib/health-check.ts';

const result = runHealthCheck({
  startupOk: true,
  appReady: true,
  dbReady: true,
});

assert.equal(result.ok, true);
assert.deepEqual(result.issues, []);

