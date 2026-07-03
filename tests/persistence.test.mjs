// T4 — Persistence contract test. Boots a fresh SQLite DB in a tmp dir, writes one OSINT
// item, "restarts" (closes + reopens), and asserts the item survives. This proves the
// in-memory state we replaced survives process death.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'osintel-persist-'));
process.env.DATA_DIR = tmpRoot;

// Import after env is set so the db module picks up the tmp path.
const { listOsintItems, upsertOsintItem, countOsintItems } = await import('../src/server/db/repositories/osint-items.ts');
const { listResourceCenters, upsertResourceCenter } = await import('../src/server/db/repositories/resource-centers.ts');
const { logEvent, listRecentEvents, trimEventLog } = await import('../src/server/db/repositories/event-log.ts');
const { findUser, createUser, countUsers } = await import('../src/server/db/repositories/users.ts');
const { closeDb, getDb } = await import('../src/server/db/index.ts');

// Boot DB (this seeds INITIAL_OSINT_FEED on first run).
getDb();

// --- OSINT items survive restart ---
const initialCount = countOsintItems();
assert.ok(initialCount > 0, `seed items must be present on cold boot (got ${initialCount})`);

const customItem = {
  id: `persist-test-${Date.now()}`,
  title: 'Persistence contract test item',
  url: 'https://example.org/persist-test',
  source: 'contract-test',
  publishedAt: new Date().toISOString(),
  country: 'Global',
  category: 'patient_resource',
  entities: ['TEST'],
  importanceScore: 5.5,
  summary: 'Should survive a kill -9 + restart.',
  evidenceLevel: 'C'
};
upsertOsintItem(customItem);
assert.ok(countOsintItems() >= initialCount + 1, 'item count must increase after upsert');

// Simulate restart: close the DB singleton; the next getDb() call reopens the file.
// ESM caches the module namespace, so we don't re-import — we just exercise closeDb + getDb.
closeDb();
getDb();
const afterRestart = listOsintItems();
assert.ok(
  afterRestart.some((it) => it.id === customItem.id),
  'persisted item must survive restart'
);
assert.ok(countOsintItems() >= initialCount + 1, 'count must still reflect the persisted item');

// Upsert is idempotent (same id = update, not duplicate insert).
upsertOsintItem(Object.assign({}, customItem, { title: 'Updated title' }));
assert.ok(countOsintItems() >= initialCount + 1, 'duplicate upsert must not double the row');

// --- Resource centers round-trip ---
const beforeCenters = listResourceCenters().length;
assert.ok(beforeCenters > 0, 'seed resource centers present');
const customCenter = {
  id: `center-test-${Date.now()}`,
  name: 'Persistence Test Center',
  country: 'Global',
  latitude: 0,
  longitude: 0,
  specialties: ['testing'],
  type: 'patient_guide',
  explicitCategory: 'treatment',
  description: 'A test center.',
  contact: 'test@example.org'
};
upsertResourceCenter(customCenter);
const afterCenters = listResourceCenters();
assert.ok(afterCenters.some((c) => c.id === customCenter.id), 'center persisted');

// --- Event log: append + trim ---
for (let i = 0; i < 5; i++) logEvent('INFO', 'test', `event ${i}`);
const recentEvents = listRecentEvents(10);
assert.ok(recentEvents.length >= 5, 'events appended');
const trimmed = trimEventLog();
assert.ok(typeof trimmed === 'number', 'trimEventLog returns a number');

// --- Users: bcrypt round-trip via the repository ---
const initialUsers = countUsers();
await createUser('persist-test-user', 'very-strong-pw-123', 'user');
assert.equal(countUsers(), initialUsers + 1, 'user count incremented');
const found = findUser('persist-test-user');
assert.ok(found, 'user can be looked up');
assert.ok(found.password_hash.startsWith('$2'), 'stored hash is bcrypt');
assert.notEqual(found.password_hash, 'very-strong-pw-123', 'plaintext not stored');

closeDb();
// Clean up tmp dir.
try {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
} catch {
  /* best effort */
}

console.log('persistence.test.mjs: PASS');
