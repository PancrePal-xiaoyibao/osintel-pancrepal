// SQLite persistence layer (T4).
//
// Uses Node 24's built-in `node:sqlite` (no native compilation, no extra dependency).
// The schema bootstraps idempotently on first boot; existing in-memory state is seeded from
// INITIAL_OSINT_FEED / INITIAL_RESOURCE_CENTERS on a cold DB.
//
// Concurrency: WAL mode for better read concurrency under the 5-min auto-refresh writer.
// File path: `${DATA_DIR || ./data}/app.db` — Docker volume-mounts `./data`.
//
// NOTE: `node:sqlite` ships an experimental warning on stderr; that's expected and harmless.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { logger } from '../logger.ts';
import { INITIAL_OSINT_FEED, INITIAL_RESOURCE_CENTERS } from '../../seed-data.ts';
import type { OSINTItem, ResourceCenter } from '../../types.ts';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

let dbInstance: DatabaseSync | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    logger.info({ dir: DATA_DIR }, 'db_data_dir_created');
  }
}

function bootstrapSchema(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      username        TEXT PRIMARY KEY,
      password_hash   TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'user',
      created_at      TEXT NOT NULL,
      last_login      TEXT
    );

    CREATE TABLE IF NOT EXISTS osint_items (
      id              TEXT PRIMARY KEY,
      title           TEXT NOT NULL,
      url             TEXT,
      source          TEXT,
      published_at    TEXT,
      category        TEXT,
      evidence_level  TEXT,
      importance_score REAL,
      summary         TEXT,
      raw_json        TEXT NOT NULL,
      ingested_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_osint_ingested ON osint_items(ingested_at DESC);
    CREATE INDEX IF NOT EXISTS idx_osint_published ON osint_items(published_at DESC);

    CREATE TABLE IF NOT EXISTS resource_centers (
      id                TEXT PRIMARY KEY,
      name              TEXT,
      country           TEXT,
      latitude          REAL,
      longitude         REAL,
      explicit_category TEXT,
      raw_json          TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ts          TEXT NOT NULL,
      level       TEXT NOT NULL,
      source      TEXT,
      message     TEXT,
      meta_json   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_event_ts ON event_log(ts DESC);

    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function seedIfEmpty(db: DatabaseSync): void {
  const osintCount = (db.prepare('SELECT COUNT(*) AS n FROM osint_items').get() as { n: number }).n;
  if (osintCount === 0) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO osint_items
       (id, title, url, source, published_at, category, evidence_level, importance_score, summary, raw_json, ingested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    db.exec('BEGIN');
    try {
      for (const it of INITIAL_OSINT_FEED) {
        insert.run(
          it.id,
          it.title,
          it.url ?? null,
          it.source ?? null,
          it.publishedAt ?? null,
          it.category ?? null,
          it.evidenceLevel ?? null,
          it.importanceScore ?? null,
          it.summary ?? null,
          JSON.stringify(it),
          now
        );
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    logger.info({ seeded: INITIAL_OSINT_FEED.length }, 'db_seeded_osint_items');
  }

  const centerCount = (db.prepare('SELECT COUNT(*) AS n FROM resource_centers').get() as { n: number }).n;
  if (centerCount === 0) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO resource_centers
       (id, name, country, latitude, longitude, explicit_category, raw_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    db.exec('BEGIN');
    try {
      for (const c of INITIAL_RESOURCE_CENTERS) {
        insert.run(
          c.id,
          c.name ?? null,
          c.country ?? null,
          c.latitude ?? null,
          c.longitude ?? null,
          c.explicitCategory ?? null,
          JSON.stringify(c),
          now
        );
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    logger.info({ seeded: INITIAL_RESOURCE_CENTERS.length }, 'db_seeded_resource_centers');
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;
  ensureDataDir();
  const db = new DatabaseSync(DB_PATH);
  bootstrapSchema(db);
  seedIfEmpty(db);
  dbInstance = db;
  logger.info({ path: DB_PATH }, 'db_initialized');
  return db;
}

export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'db_close_failed');
    }
    dbInstance = null;
  }
}

export { DB_PATH, DATA_DIR };
