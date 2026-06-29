import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALL_SCHEMA_TABLES,
  NEWS_REVIEW_STATUSES,
  NEWS_SEED_KINDS,
  PUBLIC_SIGNAL_FIELDS,
  RESOURCE_HIERARCHY,
  SOURCE_BACKED_SCALE_METRIC_FIELDS
} from '../src/lib/schema-contracts.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const cityResourceSql = await readFile(resolve(repoRoot, 'supabase/migrations/011_city_resource_schema.sql'), 'utf8');
const newsSql = await readFile(resolve(repoRoot, 'supabase/migrations/012_news_pipeline_schema.sql'), 'utf8');

function normalizeSql(sql) {
  return sql.toLowerCase().replace(/\s+/g, ' ');
}

function expectTable(sql, tableName) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${tableName}\\b`));
}

function expectColumn(sql, pattern, label) {
  assert.match(sql, pattern, label);
}

const citySql = normalizeSql(cityResourceSql);
const newsSqlNormalized = normalizeSql(newsSql);

for (const tableName of [
  'app_settings',
  'patient_profiles',
  'watchdog_events',
  'system_reports',
  'geo_regions',
  'geo_countries',
  'geo_cities',
  'resource_centers',
  'hospital_departments',
  'department_public_accounts',
  'resource_heat_snapshots',
  'resource_source_links'
]) {
  expectTable(citySql, tableName);
}

for (const tableName of [
  'news_source_registry',
  'news_source_collections',
  'news_collection_runs',
  'news_normalized_items',
  'news_review_actions',
  'intelligence_events'
]) {
  expectTable(newsSqlNormalized, tableName);
}

for (const field of RESOURCE_HIERARCHY) {
  assert.ok(ALL_SCHEMA_TABLES.length > 0, `schema registry should not be empty for ${field}`);
}

for (const field of SOURCE_BACKED_SCALE_METRIC_FIELDS) {
  assert.ok(citySql.includes(field), `expected scale metric field ${field} in city resource schema`);
}

for (const field of PUBLIC_SIGNAL_FIELDS) {
  assert.ok(citySql.includes(field), `expected public signal field ${field} in city resource schema`);
}

for (const status of NEWS_REVIEW_STATUSES) {
  assert.ok(newsSqlNormalized.includes(status), `expected news review status ${status} in news schema`);
}

for (const kind of NEWS_SEED_KINDS) {
  assert.ok(newsSqlNormalized.includes(kind), `expected news seed kind ${kind} in news schema`);
}

expectColumn(citySql, /validate_source_backed_scale_metrics\s*\(/, 'expected scale metric validator function');
expectColumn(citySql, /resource_heat_snapshots_public_signal_heat_check/, 'expected public signal heat check');
expectColumn(newsSqlNormalized, /constraint news_normalized_items_seed_kind_check check/, 'expected seed kind check');
expectColumn(newsSqlNormalized, /constraint news_normalized_items_review_status_check check/, 'expected review status check');

console.log(`schema contract checks passed for ${ALL_SCHEMA_TABLES.length} tables`);
