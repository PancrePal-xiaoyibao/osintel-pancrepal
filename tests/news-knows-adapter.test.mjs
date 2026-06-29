import assert from 'node:assert/strict';
import { fetchKnowsEvidence } from '../src/lib/news/knows-adapter.ts';

// Real KnowS API returns { question_id, evidences[] }.
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async text() {
    return JSON.stringify({
      question_id: 'q-1',
      evidences: [
        {
          id: 'e1',
          title: 'Center-first clinical update on KRAS',
          abstract: 'A clinical summary about pancreatic cancer.',
          metadata: {
            journal: 'Journal of Clinical Oncology',
            doi: '10.1200/x',
            publish_date: '2026-06-26'
          },
          pmid: '40000123',
          study_type: 'trial'
        }
      ]
    });
  }
});

const result = await fetchKnowsEvidence({
  query: 'pancreatic cancer',
  apiKey: 'test-key',
  baseUrl: 'https://api.nullht.com',
  windowLabel: '24h',
  observedAt: '2026-06-26T12:00:00.000Z'
});

assert.equal(result.ok, true);
assert.equal(result.items.length, 1);
assert.equal(result.items[0].windowLabel, '24h');
assert.equal(result.items[0].title, 'Center-first clinical update on KRAS');
assert.equal(result.items[0].sourceTitle, 'Journal of Clinical Oncology');

// Anonymous tier: no API key still works (shared client allows it).
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async text() {
    return JSON.stringify({ question_id: 'q-2', evidences: [] });
  }
});
const anon = await fetchKnowsEvidence({
  query: 'pancreatic cancer',
  baseUrl: 'https://api.nullht.com',
  windowLabel: '7d'
});
assert.equal(anon.ok, true);
assert.equal(anon.items.length, 0);

console.log('news-knows-adapter.test.mjs: PASS');
