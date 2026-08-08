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

async function apiFetch(path) {
  const res = await fetch(`${baseUrl}${path}`);
  const body = await res.json();
  return { status: res.status, body };
}

describe('Centers Frontend Data Integration', () => {
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

  describe('Hospital Data Shape', () => {
    let hospitals;

    before(async () => {
      const { body } = await apiFetch('/api/centers/hospitals?limit=200');
      hospitals = body.data;
    });

    it('should return hospital array', () => {
      assert.ok(Array.isArray(hospitals));
      assert.ok(hospitals.length >= 20);
    });

    it('should have required hospital fields', () => {
      const h = hospitals[0];
      assert.ok(h.id);
      assert.ok(h.name);
      assert.ok(h.city);
      assert.ok(h.province);
      assert.ok(h.country);
      assert.ok(typeof h.latitude === 'number');
      assert.ok(typeof h.longitude === 'number');
      assert.ok(typeof h.hasMDT === 'boolean');
      assert.ok(Array.isArray(h.sourceUrls));
      assert.ok(typeof h.qualityScore === 'number');
    });

    it('should have valid qualityScore range', () => {
      hospitals.forEach(h => {
        assert.ok(h.qualityScore >= 0 && h.qualityScore <= 100, `${h.id}: qualityScore=${h.qualityScore}`);
      });
    });

    it('should return 404 for unknown hospital', async () => {
      const { status } = await apiFetch('/api/centers/hospitals/xxxxxxxxxx');
      assert.equal(status, 404);
    });
  });

  describe('Doctor Data Shape', () => {
    let doctors;

    before(async () => {
      const { body } = await apiFetch('/api/centers/doctors?limit=200');
      doctors = body.data;
    });

    it('should return doctor array', () => {
      assert.ok(Array.isArray(doctors));
      assert.ok(doctors.length >= 15);
    });

    it('should have required doctor fields', () => {
      const d = doctors[0];
      assert.ok(d.id);
      assert.ok(d.name);
      assert.ok(d.title);
      assert.ok(Array.isArray(d.hospitalIds));
      assert.ok(Array.isArray(d.specialties));
      assert.ok(typeof d.qualityScore === 'number');
    });

    it('should filter doctors by hospitalId', async () => {
      const { body } = await apiFetch('/api/centers/doctors?hospitalId=hosp-sh-fudan-tumor');
      assert.ok(body.data.length > 0);
      body.data.forEach(d => {
        assert.ok(d.hospitalIds.includes('hosp-sh-fudan-tumor'));
      });
    });

    it('should filter doctors by specialty substring', async () => {
      const { body } = await apiFetch('/api/centers/doctors?specialty=胰腺癌');
      assert.ok(body.data.length > 0);
      body.data.forEach(d => {
        assert.ok(d.specialties.some(s => s.includes('胰腺癌')));
      });
    });
  });

  describe('Service Data Shape', () => {
    let services;

    before(async () => {
      const { body } = await apiFetch('/api/centers/services?limit=200');
      services = body.data;
    });

    it('should return service array', () => {
      assert.ok(Array.isArray(services));
      assert.ok(services.length >= 10);
    });

    it('should have required service fields', () => {
      const s = services[0];
      assert.ok(s.id);
      assert.ok(s.name);
      assert.ok(s.description);
      assert.ok(s.category);
      assert.ok(s.hospitalId);
      assert.ok(s.availability);
    });

    it('should filter services by category', async () => {
      const { body } = await apiFetch('/api/centers/services?category=surgery');
      assert.ok(body.status === 'ok');
      body.data.forEach(s => {
        assert.equal(s.category, 'surgery');
      });
    });

    it('should filter services by availability', async () => {
      const { body } = await apiFetch('/api/centers/services?availability=within_month');
      assert.ok(body.status === 'ok');
      body.data.forEach(s => {
        assert.equal(s.availability, 'within_month');
      });
    });

    it('should list all valid categories', () => {
      const validCategories = ['surgery', 'chemotherapy', 'radiotherapy', 'intervention',
        'nutrition', 'psychology', 'rehabilitation', 'palliative', 'clinical_trial', 'genetic_testing'];
      services.forEach(s => {
        assert.ok(validCategories.includes(s.category), `Unknown category: ${s.category}`);
      });
    });
  });

  describe('Hospital Lookup Consistency', () => {
    it('should have consistent hospital IDs between doctors and hospitals', async () => {
      const { body: hospBody } = await apiFetch('/api/centers/hospitals?limit=200');
      const { body: docBody } = await apiFetch('/api/centers/doctors?limit=200');
      const hospitalIds = new Set(hospBody.data.map(h => h.id));

      let missingCount = 0;
      docBody.data.forEach(d => {
        d.hospitalIds.forEach(hid => {
          if (!hospitalIds.has(hid)) missingCount++;
        });
      });

      assert.ok(missingCount === 0, `${missingCount} doctor-hospital references are dangling`);
    });

    it('should have consistent hospital IDs between services and hospitals', async () => {
      const { body: hospBody } = await apiFetch('/api/centers/hospitals?limit=200');
      const { body: svcBody } = await apiFetch('/api/centers/services?limit=200');
      const hospitalIds = new Set(hospBody.data.map(h => h.id));

      let missingCount = 0;
      svcBody.data.forEach(s => {
        if (!hospitalIds.has(s.hospitalId)) missingCount++;
      });

      assert.ok(missingCount === 0, `${missingCount} service-hospital references are dangling`);
    });
  });
});
