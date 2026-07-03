// Resource centers repository — read/upsert the pancreatic centers list.
import type { DatabaseSync } from 'node:sqlite';
import type { ResourceCenter } from '../../../types.ts';
import { getDb } from '../index.ts';

interface CenterRow {
  id: string;
  raw_json: string;
  updated_at: string;
}

function rowToCenter(row: CenterRow): ResourceCenter {
  return JSON.parse(row.raw_json) as ResourceCenter;
}

export function listResourceCenters(): ResourceCenter[] {
  const db: DatabaseSync = getDb();
  const rows = db.prepare('SELECT * FROM resource_centers').all() as unknown as CenterRow[];
  return rows.map(rowToCenter);
}

export function upsertResourceCenter(center: ResourceCenter): void {
  const db: DatabaseSync = getDb();
  db.prepare(`
    INSERT INTO resource_centers (id, name, country, latitude, longitude, explicit_category, raw_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, country = excluded.country, latitude = excluded.latitude,
      longitude = excluded.longitude, explicit_category = excluded.explicit_category,
      raw_json = excluded.raw_json, updated_at = excluded.updated_at
  `).run(
    center.id,
    center.name ?? null,
    center.country ?? null,
    center.latitude ?? null,
    center.longitude ?? null,
    center.explicitCategory ?? null,
    JSON.stringify(center),
    new Date().toISOString()
  );
}
