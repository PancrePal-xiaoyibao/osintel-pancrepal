// Cross-platform test runner for tests/*.test.mjs (T6).
//
// The existing contract tests use side-effect `assert.*` calls rather than the
// `node:test` `test('name', ...)` API, so `node --test` can't pick them up.
// This runner just spawns each file sequentially and aggregates the exit codes.
//
// Usage: node scripts/run-tests.mjs
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(here, '..', 'tests');

const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort();

if (files.length === 0) {
  console.error('No tests/*.test.mjs files found.');
  process.exit(2);
}

const failed = [];
for (const f of files) {
  const file = path.join(testsDir, f);
  process.stdout.write(`${f.padEnd(48)} `);
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed.push(f);
  }
}

console.log('');
console.log(`Total: ${files.length - failed.length}/${files.length} passed`);
if (failed.length > 0) {
  console.error('FAILED:');
  for (const f of failed) console.error(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
