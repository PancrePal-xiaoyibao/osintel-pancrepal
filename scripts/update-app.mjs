import { execFileSync } from 'node:child_process';
import { runGitDrivenUpdate } from '../src/lib/update-runner.ts';

const cwd = process.cwd();

function runCommand(step) {
  execFileSync(step.command, step.args, { cwd, stdio: 'inherit' });
}

function readCommit() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim();
}

const currentCommit = readCommit();
const result = await runGitDrivenUpdate({
  currentCommit,
  pullStep: {
    command: 'git',
    args: ['pull', '--ff-only'],
    label: 'git pull'
  },
  buildSteps: [
    { command: 'npm', args: ['run', 'build'], label: 'npm run build' }
  ],
  smokeSteps: [
    { command: 'npm', args: ['run', 'lint'], label: 'npm run lint' },
    { command: 'node', args: ['tests/startup-check.test.mjs'], label: 'startup-check' },
    { command: 'node', args: ['tests/health-check.test.mjs'], label: 'health-check' },
    { command: 'node', args: ['tests/update-runner.test.mjs'], label: 'update-runner' }
  ],
  runCommand,
  getNextCommit: async () => readCommit(),
  rollback: async (commit) => {
    execFileSync('git', ['reset', '--hard', commit], { cwd, stdio: 'inherit' });
  }
});

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.ok ? 0 : 1;

