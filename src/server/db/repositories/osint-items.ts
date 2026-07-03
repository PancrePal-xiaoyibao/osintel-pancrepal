// OSINT items repository — read/upsert the production feed from SQLite.
//
// The old in-memory `let osintFeed: OSINTItem[]` survives as a read-through cache here.
// Writes happen on /api/osint/feed/refresh, /api/osint/manual-ingest, and auto-refresh.
import type { DatabaseSync } from 'node:sqlite';
import type { OSINTItem } from '../../../types.ts';
import { getDb } from '../index.ts';

interface OsintRow {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  published_at: string | null;
  category: string | null;
  evidence_level: string | null;
  importance_score: number | null;
  summary: string | null;
  raw_json: string;
  ingested_at: string;
}

function rowToItem(row: OsintRow): OSINTItem {
  const parsed = JSON.parse(row.raw_json) as OSINTItem;
  // Prefer persisted column values where present, fall back to raw_json
  return {
    ...parsed,
    id: row.id,
    title: row.title,
    url: row.url ?? parsed.url ?? '',
    source: row.source ?? parsed.source ?? '',
    publishedAt: row.published_at ?? parsed.publishedAt ?? '',
    category: (row.category as OSINTItem['category']) ?? parsed.category ?? 'patient_resource',
    evidenceLevel: (row.evidence_level as OSINTItem['evidenceLevel']) ?? parsed.evidenceLevel ?? 'D',
    importanceScore: row.importance_score ?? parsed.importanceScore ?? 0,
    summary: row.summary ?? parsed.summary ?? ''
  };
}

export function listOsintItems(limit = 300): OSINTItem[] {
  const db: DatabaseSync = getDb();
  const rows = db.prepare('SELECT * FROM osint_items ORDER BY ingested_at DESC LIMIT ?').all(limit) as unknown as OsintRow[];
  return rows.map(rowToItem);
}

export function upsertOsintItem(item: OSINTItem, ingestedAt?: string): boolean {
  const db: DatabaseSync = getDb();
  const stmt = db.prepare(`
    INSERT INTO osint_items (id, title, url, source, published_at, category, evidence_level,
                             importance_score, summary, raw_json, ingested_at)
    VALUES (@id, @title, @url, @source, @published_at, @category, @evidence_level,
            @importance_score, @summary, @raw_json, @ingested_at)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      url = excluded.url,
      source = excluded.source,
      published_at = excluded.published_at,
      category = excluded.category,
      evidence_level = excluded.evidence_level,
      importance_score = excluded.importance_score,
      summary = excluded.summary,
      raw_json = excluded.raw_json,
      ingested_at = excluded.ingested_at
  `);
  const now = ingestedAt ?? new Date().toISOString();
  const result = stmt.run({
    id: item.id,
    title: item.title,
    url: item.url ?? null,
    source: item.source ?? null,
    published_at: item.publishedAt ?? null,
    category: item.category ?? null,
    evidence_level: item.evidenceLevel ?? null,
    importance_score: item.importanceScore ?? null,
    summary: item.summary ?? null,
    raw_json: JSON.stringify(item),
    ingested_at: now
  });
  return result.changes > 0;
}

export function upsertOsintItems(items: OSINTItem[], ingestedAt?: string): number {
  const db: DatabaseSync = getDb();
  const now = ingestedAt ?? new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO osint_items (id, title, url, source, published_at, category, evidence_level,
                             importance_score, summary, raw_json, ingested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title, url = excluded.url, source = excluded.source,
      published_at = excluded.published_at, category = excluded.category,
      evidence_level = excluded.evidence_level, importance_score = excluded.importance_score,
      summary = excluded.summary, raw_json = excluded.raw_json,
      ingested_at = excluded.ingested_at
  `);
  // node:sqlite has no .transaction(); wrap in BEGIN/COMMIT manually.
  db.exec('BEGIN');
  try {
    for (const item of items) {
      stmt.run(
        item.id,
        item.title,
        item.url ?? null,
        item.source ?? null,
        item.publishedAt ?? null,
        item.category ?? null,
        item.evidenceLevel ?? null,
        item.importanceScore ?? null,
        item.summary ?? null,
        JSON.stringify(item),
        now
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return items.length;
}

export function countOsintItems(): number {
  const db: DatabaseSync = getDb();
  const row = db.prepare('SELECT COUNT(*) AS n FROM osint_items').get() as { n: number };
  return row.n;
}
