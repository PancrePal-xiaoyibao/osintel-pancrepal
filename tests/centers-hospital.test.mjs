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

describe('Centers Hospitals API', () => {
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

  it('should list all hospitals', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    // Verify hospital structure
    const hospital = body.data[0];
    assert.ok(hospital.id);
    assert.ok(hospital.name);
    assert.ok(hospital.city);
    assert.ok(hospital.country);
    assert.ok(typeof hospital.qualityScore === 'number');
    assert.ok(typeof hospital.hasMDT === 'boolean');
  });

  it('should list hospitals with default ordering by qualityScore desc', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals');
    assert.equal(status, 200);
    // First hospital should have highest quality score
    for (let i = 0; i < body.data.length - 1; i++) {
      assert.ok(body.data[i].qualityScore >= body.data[i + 1].qualityScore,
        `Expected qualityScore at ${i} (${body.data[i].qualityScore}) >= at ${i + 1} (${body.data[i + 1].qualityScore})`);
    }
  });

  it('should filter hospitals by city', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals?city=上海');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(h => {
      assert.equal(h.city, '上海');
    });
  });

  it('should filter hospitals by province', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals?province=北京');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(h => {
      assert.equal(h.province, '北京');
    });
  });

  it('should filter hospitals by hospitalLevel', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals?hospitalLevel=3A');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(h => {
      assert.equal(h.hospitalLevel, '3A');
    });
  });

  it('should filter hospitals by hospitalType', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals?hospitalType=cancer_center');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(h => {
      assert.equal(h.hospitalType, 'cancer_center');
    });
  });

  it('should paginate results with limit', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals?limit=3');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length <= 3);
    assert.ok(body.total > 3 || body.total === body.data.length);
  });

  it('should paginate results with offset', async () => {
    const { body: full } = await apiFetch('/api/centers/hospitals?limit=100');
    const { body: paged } = await apiFetch('/api/centers/hospitals?limit=3&offset=3');

    assert.equal(full.status, 'ok');
    assert.equal(paged.status, 'ok');

    if (paged.data.length > 0 && full.data.length > 3) {
      assert.equal(paged.data[0].id, full.data[3].id);
    }
  });

  it('should get hospital by id', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals/hosp-bj-xiehe');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.id, 'hosp-bj-xiehe');
    assert.equal(body.data.shortName, '协和医院');
    assert.equal(body.data.hospitalLevel, '3A');
  });

  it('should return 404 for non-existent hospital id', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals/non-existent-id');
    assert.equal(status, 404);
    assert.equal(body.status, 'error');
    assert.equal(body.message, 'Hospital not found');
  });

  it('should create a new hospital via POST', async () => {
    const newHospital = {
      id: 'hosp-test-new',
      name: '测试医院',
      city: '测试城',
      province: '测试省',
      country: '测试国',
      latitude: 30.0,
      longitude: 120.0,
      hospitalLevel: '3A',
      hospitalType: 'general',
      hasMDT: false,
      sourceUrls: [],
      dataQuality: 'unverified',
      qualityScore: 50,
      updatedAt: new Date().toISOString(),
    };

    const { status, body } = await apiFetch('/api/centers/hospitals', {
      method: 'POST',
      body: JSON.stringify(newHospital),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.id, 'hosp-test-new');

    // Verify it can be retrieved
    const { body: getBody } = await apiFetch('/api/centers/hospitals/hosp-test-new');
    assert.equal(getBody.status, 'ok');
    assert.equal(getBody.data.name, '测试医院');
  });

  it('should reject POST without required fields', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(status, 400);
    assert.equal(body.status, 'error');
    assert.equal(body.message, 'id and name are required');
  });

  it('should update hospital via PUT', async () => {
    // First create a hospital
    const hospital = {
      id: 'hosp-test-update',
      name: '待更新医院',
      city: '更新城',
      province: '更新省',
      country: '更新国',
      latitude: 31.0,
      longitude: 121.0,
      hospitalLevel: '3A',
      hospitalType: 'general',
      hasMDT: false,
      sourceUrls: [],
      dataQuality: 'unverified',
      qualityScore: 50,
      updatedAt: new Date().toISOString(),
    };
    await apiFetch('/api/centers/hospitals', {
      method: 'POST',
      body: JSON.stringify(hospital),
    });

    // Now update it
    const updates = { name: '已更新医院', qualityScore: 80 };
    const { status, body } = await apiFetch('/api/centers/hospitals/hosp-test-update', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.name, '已更新医院');
    assert.equal(body.data.qualityScore, 80);
    // City should remain unchanged
    assert.equal(body.data.city, '更新城');
  });

  it('should return 404 for PUT on non-existent hospital', async () => {
    const { status, body } = await apiFetch('/api/centers/hospitals/non-existent', {
      method: 'PUT',
      body: JSON.stringify({ name: 'test' }),
    });
    assert.equal(status, 404);
    assert.equal(body.status, 'error');
  });

  it('should sort hospitals ascending', async () => {
    const { body } = await apiFetch('/api/centers/hospitals?sortBy=qualityScore&order=asc');
    assert.equal(body.status, 'ok');
    for (let i = 0; i < body.data.length - 1; i++) {
      assert.ok(body.data[i].qualityScore <= body.data[i + 1].qualityScore,
        `Expected ascending: qualityScore at ${i} (${body.data[i].qualityScore}) <= at ${i + 1} (${body.data[i + 1].qualityScore})`);
    }
  });
});
