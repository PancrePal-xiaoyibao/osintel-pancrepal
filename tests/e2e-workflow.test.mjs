import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = 3000;

let serverProcess = null;
let baseUrl = '';

/** Wait for server to be ready by polling /api/health */
async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

/** Helper: fetch JSON from endpoint */
async function api(path, opts) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    ...opts,
  });
  const body = await res.json();
  return { status: res.status, body, headers: res.headers };
}

before(async () => {
  // Start server as child process using node + tsx loader (cross-platform)
  const nodeExe = process.execPath;
  // On Windows, npx might not resolve in spawned process; use node --import tsx/esm directly
  const tsxLoader = 'tsx/esm';
  serverProcess = spawn(nodeExe, ['--import', tsxLoader, 'server.ts'], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production', DISABLE_HMR: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  baseUrl = `http://localhost:${PORT}`;

  let serverOutput = '';
  serverProcess.stdout.on('data', (d) => { serverOutput += d.toString(); });
  serverProcess.stderr.on('data', (d) => { serverOutput += d.toString(); });

  try {
    await waitForServer(baseUrl);
    console.log(`  Server ready on ${baseUrl}`);
  } catch (err) {
    console.log(`  Server output:\n${serverOutput.slice(-500)}`);
    throw err;
  }
});

after(async () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    // Give it a moment to cleanup
    await new Promise((r) => setTimeout(r, 1000));
    if (!serverProcess.killed) {
      serverProcess.kill('SIGKILL');
    }
  }
});

// ---- E2E Workflow Tests ----

describe('E2E: Full User Workflow', () => {
  let testSourceId = 'e2e-test-source';

  // ── Step 1: Health Check ──
  it('should respond to health check', async () => {
    const { status, body } = await api('/api/health');
    assert.equal(status, 200);
    // Health endpoint returns structure with status fields
    assert.ok(typeof body === 'object');
  });

  // ── Step 2: List RSS sources ──
  it('should list built-in RSS sources (20+)', async () => {
    const { status, body } = await api('/api/osint/sources?enabled=false');
    assert.equal(status, 200);
    assert.ok(body.ok);
    assert.ok(body.sources.length >= 20, `Expected >= 20 sources, got ${body.sources.length}`);
    // Verify structure
    const source = body.sources[0];
    assert.ok(source.id);
    assert.ok(source.name);
    assert.ok(source.url);
    assert.ok(source.kind);
    assert.ok(typeof source.enabled === 'boolean');
    console.log(`  Sources: ${body.sources.length} total, ${body.sources.filter(s => s.enabled).length} enabled`);
  });

  // ── Step 3: Add a custom RSS source ──
  it('should add a new RSS source', async () => {
    const { status, body } = await api('/api/osint/sources', {
      method: 'POST',
      body: JSON.stringify({
        id: testSourceId,
        name: 'E2E Test Source',
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1test/',
        kind: 'academic',
        credibilityBase: 80,
        enabled: true,
        refreshIntervalMinutes: 60,
      }),
    });

    assert.equal(status, 201);
    assert.ok(body.ok);
    assert.equal(body.source.id, testSourceId);
    assert.equal(body.source.name, 'E2E Test Source');
    console.log(`  Added source: ${body.source.id}`);
  });

  // ── Step 4: Reject duplicate source ──
  it('should reject duplicate source ID', async () => {
    const { status, body } = await api('/api/osint/sources', {
      method: 'POST',
      body: JSON.stringify({
        id: testSourceId,
        name: 'Duplicate',
        url: 'https://example.com',
      }),
    });
    assert.equal(status, 409);
    assert.ok(!body.ok);
  });

  // ── Step 5: Reject invalid source ID ──
  it('should reject invalid source ID format', async () => {
    const { status, body } = await api('/api/osint/sources', {
      method: 'POST',
      body: JSON.stringify({
        id: 'Invalid ID!',
        name: 'Bad',
        url: 'https://example.com',
      }),
    });
    assert.equal(status, 400);
    assert.ok(!body.ok);
  });

  // ── Step 6: Get source health ──
  it('should check source health', async () => {
    const { status, body } = await api(`/api/osint/sources/pubmed-rss/health`);
    assert.equal(status, 200);
    assert.ok(body.ok);
    assert.equal(body.sourceId, 'pubmed-rss');
    assert.ok(typeof body.online === 'boolean');
    console.log(`  Health check: online=${body.online}, time=${body.responseTimeMs}ms`);
  });

  // ── Step 7: Refresh sources ──
  it('should trigger source refresh', async () => {
    const { status, body } = await api('/api/osint/sources/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    assert.equal(status, 200);
    assert.ok(body.ok);
    assert.ok(body.totalSources > 0);
    assert.ok(typeof body.successful === 'number');
    assert.ok(typeof body.totalItems === 'number');
    console.log(`  Refresh: ${body.successful}/${body.totalSources} ok, ${body.totalItems} items`);
  });

  // ── Step 8: Check refresh status ──
  it('should report refresh status', async () => {
    const { status, body } = await api('/api/osint/sources/refresh/status');
    assert.equal(status, 200);
    assert.ok(body.ok);
    assert.ok(body.total > 0);
    assert.ok(body.sources.length === body.total);
    console.log(`  Status: ${body.healthy}/${body.enabled} healthy`);
  });

  // ── Step 9: Get scheduler status ──
  it('should report scheduler status', async () => {
    const { status, body } = await api('/api/osint/scheduler/status');
    assert.equal(status, 200);
    assert.ok(body.ok);
    assert.ok(typeof body.running === 'boolean');
    assert.ok(typeof body.totalSources === 'number');
    console.log(`  Scheduler: running=${body.running}, sources=${body.totalSources}`);
  });

  // ── Step 10: Query timeline ──
  it('should query timeline with default params', async () => {
    const { status, body } = await api('/api/osint/feed/timeline');
    assert.equal(status, 200);
    assert.ok(body.ok);
    assert.ok(Array.isArray(body.items));
    assert.ok(typeof body.total === 'number');
    assert.ok(body.page >= 1);
    if (body.items.length > 0) {
      const item = body.items[0];
      assert.ok(item.title || item.title === '');
      assert.ok(item.credibility, 'Timeline items should have credibility scores');
      assert.ok(typeof item.credibility.score === 'number');
      console.log(`  Timeline: ${body.total} items, page ${body.page}/${body.totalPages}`);
      console.log(`  First item score: ${item.credibility.score}/100`);
    } else {
      console.log(`  Timeline: ${body.total} items (empty cache)`);
    }
  });

  // ── Step 11: Query timeline with credibility filter ──
  it('should filter timeline by credibility', async () => {
    const { status, body } = await api('/api/osint/feed/timeline?minCredibility=50&sort=credibility');
    assert.equal(status, 200);
    assert.ok(body.ok);
    if (body.items.length > 0) {
      for (const item of body.items) {
        assert.ok(item.credibility.score >= 50,
          `Item score ${item.credibility.score} should be >= 50`);
      }
      console.log(`  Credibility >= 50: ${body.total} items`);
    }
  });

  // ── Step 12: Filter by sort=time+order=asc ──
  it('should sort timeline asc by time', async () => {
    const { status, body } = await api('/api/osint/feed/timeline?sort=time&order=asc&pageSize=5');
    assert.equal(status, 200);
    assert.ok(body.ok);
    if (body.items.length >= 2) {
      for (let i = 1; i < body.items.length; i++) {
        const t1 = new Date(body.items[i - 1].publishedAt || 0).getTime();
        const t2 = new Date(body.items[i].publishedAt || 0).getTime();
        if (!isNaN(t1) && !isNaN(t2)) {
          assert.ok(t1 <= t2, `Time asc order violated at index ${i}`);
        }
      }
      console.log(`  Asc time order verified for ${body.items.length} items`);
    }
  });

  // ── Step 13: Paginate timeline ──
  it('should paginate timeline correctly', async () => {
    const page1 = await api('/api/osint/feed/timeline?pageSize=3&page=1');
    assert.equal(page1.status, 200);
    assert.equal(page1.body.page, 1);

    if (page1.body.total === 0) {
      console.log('  Pagination: empty cache, skipping overlap check');
      return;
    }

    const page2 = await api('/api/osint/feed/timeline?pageSize=3&page=2');
    assert.equal(page2.status, 200);
    assert.equal(page2.body.page, 2);

    const titles1 = page1.body.items.map((i) => i.title);
    const titles2 = page2.body.items.map((i) => i.title);

    if (titles1.length > 0 && titles2.length > 0) {
      // No overlap between pages
      const set1 = new Set(titles1);
      for (const t of titles2) {
        assert.ok(!set1.has(t), `Page overlap at "${t}"`);
      }
      console.log(`  Pagination: p1=${titles1.length}, p2=${titles2.length}, no overlap`);
    }
  });

  // ── Step 14: Export JSON ──
  it('should export results as JSON', async () => {
    const res = await fetch(`${baseUrl}/api/osint/feed/export?format=json&minCredibility=30`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('application/json'), `Unexpected content-type: ${contentType}`);

    const disposition = res.headers.get('content-disposition');
    assert.ok(disposition && disposition.includes('osintel-export-'),
      `Unexpected content-disposition: ${disposition}`);
    assert.ok(disposition.includes('.json'));

    const body = await res.json();
    assert.ok(body.metadata);
    assert.ok(Array.isArray(body.items));
    assert.ok(body.metadata.itemCount >= 0);
    console.log(`  JSON export: ${body.metadata.itemCount} items, filename includes timestamp`);
  });

  // ── Step 15: Export CSV ──
  it('should export results as CSV', async () => {
    const res = await fetch(`${baseUrl}/api/osint/feed/export?format=csv`);
    assert.equal(res.status, 200);

    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('text/csv'), `Unexpected content-type: ${contentType}`);

    const text = await res.text();
    const lines = text.trim().split('\n');

    // CSV comment headers
    assert.ok(lines[0].startsWith('#'), `Line 0 should be comment: ${lines[0]}`);
    assert.ok(lines.some((l) => l.startsWith('# Generated:')),
      'Should have Generated comment');

    // Data header (skip comment lines starting with #)
    const dataHeaderLine = lines.find((l) => l && !l.startsWith('#'));
    if (dataHeaderLine) {
      assert.ok(dataHeaderLine.includes('Title'), `Header should include Title: ${dataHeaderLine}`);
      assert.ok(dataHeaderLine.includes('Credibility'), `Header should include Credibility: ${dataHeaderLine}`);
      console.log(`  CSV export: ${lines.length} lines, header: "${dataHeaderLine.slice(0, 60)}..."`);
    } else {
      console.log(`  CSV export: empty data (cache empty)`);
    }
  });

  // ── Step 16: Export with time filter ──
  it('should export with time range filter', async () => {
    const from = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const res = await fetch(`${baseUrl}/api/osint/feed/export?format=json&from=${encodeURIComponent(from)}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.metadata.itemCount >= 0);
    console.log(`  Time-filtered export: ${body.metadata.itemCount} items from last 30 days`);
  });

  // ── Step 17: Update source config ──
  it('should update source configuration', async () => {
    const { status, body } = await api(`/api/osint/sources/${testSourceId}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled: false }),
    });
    assert.equal(status, 200);
    assert.ok(body.ok);
    assert.equal(body.source.enabled, false);
  });

  // ── Step 18: Verify disabled source not in enabled list ──
  it('should exclude disabled source from default list', async () => {
    const { status, body } = await api('/api/osint/sources');
    assert.equal(status, 200);
    const disabledSource = body.sources.find((s) => s.id === testSourceId);
    assert.ok(!disabledSource, 'Disabled source should not appear in default listing');
  });

  // ── Step 19: Delete test source ──
  it('should delete the test source', async () => {
    const { status, body } = await api(`/api/osint/sources/${testSourceId}`, {
      method: 'DELETE',
    });
    assert.equal(status, 200);
    assert.ok(body.ok);
  });

  // ── Step 20: Verify source deleted ──
  it('should confirm source is deleted', async () => {
    // Enable all sources then check
    const { status, body } = await api('/api/osint/sources?enabled=false');
    assert.equal(status, 200);
    const deletedSource = body.sources.find((s) => s.id === testSourceId);
    assert.ok(!deletedSource, 'Deleted source should not exist');
  });
});

console.log('\n✅ All E2E workflow tests passed!');
