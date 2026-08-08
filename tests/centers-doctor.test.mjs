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

describe('Centers Doctors API', () => {
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

  it('should list all doctors', async () => {
    const { status, body } = await apiFetch('/api/centers/doctors');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    // Verify doctor structure
    const doctor = body.data[0];
    assert.ok(doctor.id);
    assert.ok(doctor.name);
    assert.ok(Array.isArray(doctor.hospitalIds));
    assert.ok(Array.isArray(doctor.specialties));
  });

  it('should list doctors sorted by qualityScore desc', async () => {
    const { body } = await apiFetch('/api/centers/doctors');
    assert.equal(body.status, 'ok');
    for (let i = 0; i < body.data.length - 1; i++) {
      assert.ok(body.data[i].qualityScore >= body.data[i + 1].qualityScore);
    }
  });

  it('should filter doctors by hospitalId', async () => {
    const { status, body } = await apiFetch('/api/centers/doctors?hospitalId=hosp-bj-xiehe');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(d => {
      assert.ok(d.hospitalIds.includes('hosp-bj-xiehe'));
    });
  });

  it('should filter doctors by specialty (substring match)', async () => {
    const { status, body } = await apiFetch('/api/centers/doctors?specialty=胰腺癌');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(d => {
      assert.ok(d.specialties.some(s => s.includes('胰腺癌')));
    });
  });

  it('should get doctor by id', async () => {
    const { status, body } = await apiFetch('/api/centers/doctors/doc-bj-zhaoyupei');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.id, 'doc-bj-zhaoyupei');
    assert.equal(body.data.name, '赵玉沛');
    assert.equal(body.data.academicTitle, '院士');
    assert.ok(body.data.hospitalIds.includes('hosp-bj-xiehe'));
  });

  it('should return 404 for non-existent doctor', async () => {
    const { status, body } = await apiFetch('/api/centers/doctors/non-existent');
    assert.equal(status, 404);
    assert.equal(body.status, 'error');
  });

  it('should create a new doctor via POST', async () => {
    const newDoctor = {
      id: 'doc-test-new',
      name: '测试医生',
      title: '主治医师',
      hospitalIds: ['hosp-sh-fudan-tumor'],
      specialties: ['胰腺癌诊断'],
      sourceUrls: ['https://test.com'],
      dataQuality: 'unverified',
      qualityScore: 50,
      updatedAt: new Date().toISOString(),
    };

    const { status, body } = await apiFetch('/api/centers/doctors', {
      method: 'POST',
      body: JSON.stringify(newDoctor),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.id, 'doc-test-new');

    // Verify it can be retrieved
    const { body: getBody } = await apiFetch('/api/centers/doctors/doc-test-new');
    assert.equal(getBody.status, 'ok');
    assert.equal(getBody.data.name, '测试医生');
  });

  it('should reject POST without required fields', async () => {
    const { status, body } = await apiFetch('/api/centers/doctors', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    assert.equal(status, 400);
    assert.equal(body.status, 'error');
  });

  it('should update doctor via PUT', async () => {
    const doctor = {
      id: 'doc-test-update',
      name: '待更新医生',
      title: '主治医师',
      hospitalIds: ['hosp-sh-fudan-tumor'],
      specialties: ['胰腺癌'],
      sourceUrls: [],
      dataQuality: 'unverified',
      qualityScore: 50,
      updatedAt: new Date().toISOString(),
    };
    await apiFetch('/api/centers/doctors', {
      method: 'POST',
      body: JSON.stringify(doctor),
    });

    const updates = { name: '已更新医生', qualityScore: 85 };
    const { status, body } = await apiFetch('/api/centers/doctors/doc-test-update', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    assert.equal(status, 200);
    assert.equal(body.data.name, '已更新医生');
    assert.equal(body.data.qualityScore, 85);
    assert.equal(body.data.title, '主治医师'); // unchanged
  });

  it('should return 404 for PUT on non-existent doctor', async () => {
    const { status, body } = await apiFetch('/api/centers/doctors/non-existent', {
      method: 'PUT',
      body: JSON.stringify({ name: 'test' }),
    });
    assert.equal(status, 404);
    assert.equal(body.status, 'error');
  });
});
