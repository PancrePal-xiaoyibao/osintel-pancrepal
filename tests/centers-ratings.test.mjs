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

async function apiFetch(path, opts) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
    ...opts,
  });
  const body = await res.json();
  return { status: res.status, body };
}

describe('Centers Quality & Ratings API', () => {
  before(async () => {
    const nodeExe = process.execPath;
    serverProcess = spawn(nodeExe, ['--import', 'tsx/esm', 'server.ts'], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production', DISABLE_HMR: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    baseUrl = `http://localhost:${PORT}`;

    try {
      await waitForServer(baseUrl);
    } catch (err) {
      console.error('Server failed to start');
      throw err;
    }
  });

  after(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  describe('Quality Scoring', () => {
    it('should get quality score for a hospital', async () => {
      const { status, body } = await apiFetch('/api/centers/quality/hospital/hosp-bj-xiehe');
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
      assert.ok(typeof body.data.score === 'number');
      assert.ok(body.data.score >= 0 && body.data.score <= 100);
      assert.ok(body.data.breakdown);
      assert.ok(typeof body.data.breakdown.dataCompleteness === 'number');
      assert.ok(typeof body.data.breakdown.sourceAuthority === 'number');
      assert.ok(typeof body.data.breakdown.crossValidation === 'number');
      assert.ok(typeof body.data.breakdown.accreditation === 'number');
      assert.ok(typeof body.data.breakdown.timeliness === 'number');
      assert.ok(body.data.scoredAt);
    });

    it('should get quality score for a doctor', async () => {
      const { status, body } = await apiFetch('/api/centers/quality/doctor/doc-bj-zhaoyupei');
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
      assert.ok(typeof body.data.score === 'number');
    });

    it('should get quality score for a service', async () => {
      const { status, body } = await apiFetch('/api/centers/quality/service/svc-sh-fudan-mdt');
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
      assert.ok(typeof body.data.score === 'number');
    });

    it('should return 404 for non-existent entity', async () => {
      const { status } = await apiFetch('/api/centers/quality/hospital/xxxxxxxxxx');
      assert.equal(status, 404);
    });

    it('should return 400 for invalid entity type', async () => {
      const { status, body } = await apiFetch('/api/centers/quality/invalid/id');
      assert.equal(status, 400);
      assert.equal(body.status, 'error');
    });
  });

  describe('Ratings CRUD', () => {
    it('should submit a rating', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'hospital',
          entityId: 'hosp-bj-xiehe',
          userId: 'test-user-1',
          score: 5,
          comment: '非常好的医院',
          aspects: { expertise: 5, communication: 4, efficiency: 4, facilities: 5 },
        }),
      });
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
      assert.equal(body.data.score, 5);
      assert.equal(body.data.userId, 'test-user-1');
      assert.equal(body.data.entityId, 'hosp-bj-xiehe');
      assert.equal(body.isNew, true);
    });

    it('should update existing rating (upsert)', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'hospital',
          entityId: 'hosp-bj-xiehe',
          userId: 'test-user-1',
          score: 3,
          comment: '更新评价',
        }),
      });
      assert.equal(status, 200);
      assert.equal(body.data.score, 3);
      assert.equal(body.data.comment, '更新评价');
      assert.equal(body.isNew, false);
    });

    it('should reject invalid score (0)', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'hospital',
          entityId: 'hosp-bj-xiehe',
          userId: 'test-user-2',
          score: 0,
        }),
      });
      assert.equal(status, 400);
      assert.equal(body.status, 'error');
    });

    it('should reject invalid score (6)', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'hospital',
          entityId: 'hosp-bj-xiehe',
          userId: 'test-user-3',
          score: 6,
        }),
      });
      assert.equal(status, 400);
      assert.equal(body.status, 'error');
    });

    it('should reject invalid score (float)', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'hospital',
          entityId: 'hosp-bj-xiehe',
          userId: 'test-user-4',
          score: 3.5,
        }),
      });
      assert.equal(status, 400);
    });

    it('should reject missing required fields', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings', {
        method: 'POST',
        body: JSON.stringify({ entityType: 'hospital' }),
      });
      assert.equal(status, 400);
      assert.equal(body.status, 'error');
    });

    it('should submit multiple ratings from different users', async () => {
      for (let i = 2; i <= 5; i++) {
        const { status } = await apiFetch('/api/centers/ratings', {
          method: 'POST',
          body: JSON.stringify({
            entityType: 'hospital',
            entityId: 'hosp-bj-xiehe',
            userId: `test-user-${i}`,
            score: i,
          }),
        });
        assert.equal(status, 200);
      }
    });

    it('should list ratings for an entity', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings/hospital/hosp-bj-xiehe');
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 5);
    });

    it('should return aggregate statistics', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings/hospital/hosp-bj-xiehe');
      assert.equal(status, 200);
      assert.ok(body.aggregate);
      assert.ok(body.aggregate.count >= 5);
      assert.ok(typeof body.aggregate.avg === 'number');
      assert.ok(body.aggregate.avg >= 1 && body.aggregate.avg <= 5);
      assert.ok(Array.isArray(body.aggregate.distribution));
      assert.equal(body.aggregate.distribution.length, 5);
    });

    it('should return empty results for unrated entity', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings/hospital/never-rated');
      assert.equal(status, 200);
      assert.equal(body.aggregate.count, 0);
      assert.equal(body.aggregate.avg, 0);
    });

    it('should reject invalid entity type for ratings list', async () => {
      const { status, body } = await apiFetch('/api/centers/ratings/invalid/id');
      assert.equal(status, 400);
      assert.equal(body.status, 'error');
    });
  });
});
