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

describe('Centers Submissions API', () => {
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

  const validHospitalPayload = {
    entityType: 'hospital',
    action: 'create',
    payload: {
      id: 'hosp-test-submitted',
      name: '提交测试医院',
      city: '测试城',
      province: '测试省',
      country: '中国',
      latitude: 30.0,
      longitude: 120.0,
      hospitalLevel: '3A',
      hospitalType: 'general',
      hasMDT: true,
      sourceUrls: [],
      dataQuality: 'unverified',
      qualityScore: 50,
    },
    submitterName: '测试提交者',
    sourceUrls: ['https://test-submission.example.com/hospital'],
  };

  const validDoctorPayload = {
    entityType: 'doctor',
    action: 'create',
    payload: {
      id: 'doc-test-submitted',
      name: '测试医生提交',
      title: '主任医师',
      hospitalIds: ['hosp-sh-fudan-tumor'],
      specialties: ['胰腺癌诊断'],
      sourceUrls: [],
      dataQuality: 'unverified',
      qualityScore: 50,
    },
    submitterName: '测试提交者',
    sourceUrls: ['https://test-submission.example.com/doctor'],
  };

  it('should create a hospital submission', async () => {
    const { status, body } = await apiFetch('/api/centers/submissions', {
      method: 'POST',
      body: JSON.stringify(validHospitalPayload),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.data.id.startsWith('sub-'));
    assert.equal(body.data.entityType, 'hospital');
    assert.equal(body.data.status, 'pending');
    assert.equal(body.data.submitterName, '测试提交者');
  });

  it('should create a doctor submission', async () => {
    const { status, body } = await apiFetch('/api/centers/submissions', {
      method: 'POST',
      body: JSON.stringify(validDoctorPayload),
    });

    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.data.entityType, 'doctor');
    assert.equal(body.data.status, 'pending');
  });

  it('should reject submission with invalid entityType', async () => {
    const { status, body } = await apiFetch('/api/centers/submissions', {
      method: 'POST',
      body: JSON.stringify({ ...validHospitalPayload, entityType: 'invalid' }),
    });

    assert.equal(status, 400);
    assert.equal(body.status, 'error');
  });

  it('should reject submission without payload.name', async () => {
    const { status, body } = await apiFetch('/api/centers/submissions', {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'hospital',
        action: 'create',
        payload: { id: 'hosp-x' },
        sourceUrls: [],
      }),
    });

    assert.equal(status, 400);
    assert.equal(body.status, 'error');
  });

  it('should detect duplicate submission by same source URLs', async () => {
    // First submission
    await apiFetch('/api/centers/submissions', {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'hospital',
        action: 'create',
        payload: { id: 'hosp-dup-test', name: '重复测试医院', city: 'x', province: 'x', country: 'x', latitude: 0, longitude: 0, hospitalLevel: '3A', hospitalType: 'general', hasMDT: false, sourceUrls: [], dataQuality: 'unverified', qualityScore: 0 },
        sourceUrls: ['https://unique-test-url.example.com'],
      }),
    });

    // Second submission with same URL
    const { status, body } = await apiFetch('/api/centers/submissions', {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'hospital',
        action: 'create',
        payload: { id: 'hosp-dup-test-2', name: '重复测试医院2', city: 'x', province: 'x', country: 'x', latitude: 0, longitude: 0, hospitalLevel: '3A', hospitalType: 'general', hasMDT: false, sourceUrls: [], dataQuality: 'unverified', qualityScore: 0 },
        sourceUrls: ['https://unique-test-url.example.com'],
      }),
    });

    assert.equal(status, 409);
    assert.equal(body.status, 'error');
    assert.ok(body.message.includes('already exists'));
  });

  it('should list pending submissions', async () => {
    const { status, body } = await apiFetch('/api/centers/submissions?status=pending');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    body.data.forEach(s => assert.equal(s.status, 'pending'));
  });

  it('should list all submissions', async () => {
    const { status, body } = await apiFetch('/api/centers/submissions');
    assert.equal(status, 200);
    assert.ok(body.total > 0);
  });

  it('should approve a submission and upsert into hospitals', async () => {
    // First get the pending submission
    const { body: listBody } = await apiFetch('/api/centers/submissions?status=pending');
    assert.ok(listBody.data.length > 0);

    const pendingSub = listBody.data.find(s => s.entityType === 'hospital' && s.payload.id === 'hosp-test-submitted');
    assert.ok(pendingSub, 'Should find the hospital submission');

    // Approve it
    const { status, body } = await apiFetch(`/api/centers/submissions/${pendingSub.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', comment: '审核通过' }),
    });

    assert.equal(status, 200);
    assert.equal(body.data.status, 'approved');

    // Verify it was upserted into hospitals
    const { body: hospBody } = await apiFetch('/api/centers/hospitals/hosp-test-submitted');
    assert.equal(hospBody.status, 'ok');
    assert.equal(hospBody.data.name, '提交测试医院');
  });

  it('should reject a submission', async () => {
    const { body: listBody } = await apiFetch('/api/centers/submissions?status=pending');
    const pendingSub = listBody.data.find(s => s.entityType === 'doctor');
    assert.ok(pendingSub, 'Should find the doctor submission');

    const { status, body } = await apiFetch(`/api/centers/submissions/${pendingSub.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', comment: '信息无法验证' }),
    });

    assert.equal(status, 200);
    assert.equal(body.data.status, 'rejected');
    assert.equal(body.data.reviewComment, '信息无法验证');
  });

  it('should return 404 for non-existent submission review', async () => {
    const { status, body } = await apiFetch('/api/centers/submissions/non-existent/review', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve' }),
    });
    assert.equal(status, 404);
  });

  it('should reject review of already-approved submission', async () => {
    const { body: listBody } = await apiFetch('/api/centers/submissions?status=approved');
    if (listBody.data.length > 0) {
      const approvedSub = listBody.data[0];
      const { status, body } = await apiFetch(`/api/centers/submissions/${approvedSub.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject' }),
      });
      assert.equal(status, 400);
      assert.ok(body.message.includes('already'));
    }
  });

  it('should list approved submissions', async () => {
    const { body } = await apiFetch('/api/centers/submissions?status=approved');
    assert.equal(body.status, 'ok');
    assert.ok(body.data.length > 0);
    body.data.forEach(s => assert.equal(s.status, 'approved'));
  });

  it('should list rejected submissions', async () => {
    const { body } = await apiFetch('/api/centers/submissions?status=rejected');
    assert.equal(body.status, 'ok');
    body.data.forEach(s => assert.equal(s.status, 'rejected'));
  });
});
