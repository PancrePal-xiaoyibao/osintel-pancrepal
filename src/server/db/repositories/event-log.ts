// Event log repository — replaces the unbounded in-memory watchdog `errorLog[]`.
//
// The legacy watchdog surface is `demo_only` per the mock-audit contract; this table backs
// the *real* ops telemetry that /api/ops/status surfaces. Capped at MAX_ROWS via periodic
// cleanup so the DB doesn't grow unbounded over months.
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../index.ts';

const MAX_ROWS = parseInt(process.env.EVENT_LOG_MAX_ROWS || '1000', 10);

export interface EventLogRow {
  id: number;
  ts: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  source: string | null;
  message: string | null;
  meta_json: string | null;
}

export function logEvent(
  level: EventLogRow['level'],
  source: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  const db: DatabaseSync = getDb();
  db.prepare(
    `INSERT INTO event_log (ts, level, source, message, meta_json) VALUES (?, ?, ?, ?, ?)`
  ).run(
    new Date().toISOString(),
    level,
    source,
    message,
    meta ? JSON.stringify(meta) : null
  );
}

export function listRecentEvents(limit = 50): EventLogRow[] {
  const db: DatabaseSync = getDb();
  return db.prepare('SELECT * FROM event_log ORDER BY ts DESC LIMIT ?').all(limit) as unknown as EventLogRow[];
}

/** Trim the table to MAX_ROWS. Call periodically (e.g. once per hour from the auto-refresh tick). */
export function trimEventLog(): number {
  const db: DatabaseSync = getDb();
  const result = db.prepare(
    `DELETE FROM event_log WHERE id NOT IN (
       SELECT id FROM event_log ORDER BY ts DESC LIMIT ?
     )`
  ).run(MAX_ROWS);
  return Number(result.changes);
}
