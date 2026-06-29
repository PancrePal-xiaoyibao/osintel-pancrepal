import assert from 'node:assert/strict';
import { runGitDrivenUpdate } from '../src/lib/update-runner.ts';

const steps = [];

const success = await runGitDrivenUpdate({
  currentCommit: 'abc123',
  pullStep: { command: 'git', args: ['pull', '--ff-only'], label: 'git pull' },
  buildSteps: [{ command: 'npm', args: ['run', 'build'], label: 'npm run build' }],
  smokeSteps: [{ command: 'npm', args: ['run', 'lint'], label: 'npm run lint' }],
  runCommand: async (step) => {
    steps.push(`${step.command} ${step.args.join(' ')}`);
  },
  getNextCommit: async () => 'def456',
  rollback: async (commit) => {
    steps.push(`git reset --hard ${commit}`);
  }
});

assert.equal(success.ok, true);
assert.equal(success.pullSucceeded, true);
assert.equal(success.rollbackRequired, false);
assert.deepEqual(steps, [
  'git pull --ff-only',
  'npm run build',
  'npm run lint'
]);

const failureSteps = [];
const failure = await runGitDrivenUpdate({
  currentCommit: 'abc123',
  pullStep: { command: 'git', args: ['pull', '--ff-only'], label: 'git pull' },
  buildSteps: [{ command: 'npm', args: ['run', 'build'], label: 'npm run build' }],
  smokeSteps: [{ command: 'npm', args: ['run', 'lint'], label: 'npm run lint' }],
  runCommand: async (step) => {
    failureSteps.push(`${step.command} ${step.args.join(' ')}`);
    if (step.label === 'npm run build') {
      throw new Error('build failed');
    }
  },
  getNextCommit: async () => 'def456',
  rollback: async (commit) => {
    failureSteps.push(`git reset --hard ${commit}`);
  }
});

assert.equal(failure.ok, false);
assert.equal(failure.rollbackRequired, true);
assert.deepEqual(failureSteps, [
  'git pull --ff-only',
  'npm run build',
  'git reset --hard abc123'
]);

