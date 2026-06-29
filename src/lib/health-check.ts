import type { CheckIssue, CheckResult } from './operations-contract';

export type HealthCheckInput = {
  startupOk: boolean;
  appReady: boolean;
  dbReady: boolean;
};

export function runHealthCheck(input: HealthCheckInput): CheckResult {
  const issues: CheckIssue[] = [];

  if (!input.startupOk) {
    issues.push({ code: 'startup_failed', message: 'startup checks are not passing' });
  }
  if (!input.appReady) {
    issues.push({ code: 'app_not_ready', message: 'application is not ready' });
  }
  if (!input.dbReady) {
    issues.push({ code: 'db_not_ready', message: 'database is not ready' });
  }

  return { ok: issues.length === 0, issues };
}
