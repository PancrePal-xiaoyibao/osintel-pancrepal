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

describe('Centers Services API', () => {
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

  it('should list all services', async () => {
    const { status, body } = await apiFetch('/api/centers/services');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    // Verify service structure
    const svc = body.data[0];
    assert.ok(svc.id);
    assert.ok(svc.name);
    assert.ok(svc.description);
    assert.ok(svc.category);
    assert.ok(svc.hospitalId);
    assert.ok(svc.availability);
    assert.ok(typeof svc.qualityScore === 'number');
  });

  it('should list services sorted by qualityScore desc', async () => {
    const { body } = await apiFetch('/api/centers/services');
    assert.equal(body.status, 'ok');
    for (let i = 0; i < body.data.length - 1; i++) {
      assert.ok(body.data[i].qualityScore >= body.data[i + 1].qualityScore);
    }
  });

  it('should filter services by hospitalId', async () => {
    const { status, body } = await apiFetch('/api/centers/services?hospitalId=hosp-bj-xiehe');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(s => {
      assert.equal(s.hospitalId, 'hosp-bj-xiehe');
    });
  });

  it('should filter services by category', async () => {
    const { status, body } = await apiFetch('/api/centers/services?category=surgery');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(s => {
      assert.equal(s.category, 'surgery');
    });
  });

  it('should filter services by availability', async () => {
    const { status, body } = await apiFetch('/api/centers/services?availability=within_month');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(s => {
      assert.equal(s.availability, 'within_month');
    });
  });

  it('should get service by id', async () => {
    const { status, body } = await apiFetch('/api/centers/services/svc-sh-fudan-mdt');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.id, 'svc-sh-fudan-mdt');
    assert.equal(body.data.category, 'surgery');
    assert.equal(body.data.hospitalId, 'hosp-sh-fudan-tumor');
  });

  it('should return 404 for non-existent service', async () => {
    const { status, body } = await apiFetch('/api/centers/services/non-existent');
    assert.equal(status, 404);
    assert.equal(body.status, 'error');
  });

  it('should create a new service via POST', async () => {
    const newService = {
      id: 'svc-test-new',
      name: '测试服务',
      description: '测试服务描述',
      category: 'nutrition',
      hospitalId: 'hosp-sh-fudan-tumor',
      availability: 'within_week',
      sourceUrls: ['https://test.com'],
      dataQuality: 'unverified',
      qualityScore: 50,
      updatedAt: new Date().toISOString(),
    };

    const { status, body } = await apiFetch('/api/centers/services', {
      method: 'POST',
      body: JSON.stringify(newService),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.id, 'svc-test-new');

    // Verify it can be retrieved
    const { body: getBody } = await apiFetch('/api/centers/services/svc-test-new');
    assert.equal(getBody.status, 'ok');
    assert.equal(getBody.data.name, '测试服务');
    assert.equal(getBody.data.category, 'nutrition');
  });

  it('should reject POST without required fields', async () => {
    const { status, body } = await apiFetch('/api/centers/services', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(status, 400);
    assert.equal(body.status, 'error');
  });

  it('should update service via PUT', async () => {
    const service = {
      id: 'svc-test-update',
      name: '待更新服务',
      description: '描述',
      category: 'nutrition',
      hospitalId: 'hosp-sh-fudan-tumor',
      availability: 'within_week',
      sourceUrls: [],
      dataQuality: 'unverified',
      qualityScore: 50,
      updatedAt: new Date().toISOString(),
    };
    await apiFetch('/api/centers/services', {
      method: 'POST',
      body: JSON.stringify(service),
    });

    const updates = { name: '已更新服务', qualityScore: 80, availability: 'immediate' };
    const { status, body } = await apiFetch('/api/centers/services/svc-test-update', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    assert.equal(status, 200);
    assert.equal(body.data.name, '已更新服务');
    assert.equal(body.data.qualityScore, 80);
    assert.equal(body.data.availability, 'immediate');
    assert.equal(body.data.category, 'nutrition'); // unchanged
  });

  it('should return 404 for PUT on non-existent service', async () => {
    const { status, body } = await apiFetch('/api/centers/services/non-existent', {
      method: 'PUT',
      body: JSON.stringify({ name: 'test' }),
    });
    assert.equal(status, 404);
    assert.equal(body.status, 'error');
  });

  it('should paginate services', async () => {
    const { body } = await apiFetch('/api/centers/services?limit=3&offset=0');
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length <= 3);
  });
});
