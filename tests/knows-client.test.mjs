import assert from 'node:assert/strict';
import {
  knowsSearch,
  knowsMultiSearch,
  normalizeBaseUrl,
  isKnowsSource,
  KNOWS_SOURCE_IDS
} from '../src/lib/knows/knows-client.ts';
import { normalizeEvidences } from '../src/lib/knows/normalize.ts';

// --- source registry ---
assert.equal(KNOWS_SOURCE_IDS.length, 6);
assert.equal(isKnowsSource('paper_en'), true);
assert.equal(isKnowsSource('bogus'), false);

// --- base url normalization ---
assert.equal(normalizeBaseUrl(), 'https://api.nullht.com/v1');
assert.equal(normalizeBaseUrl('https://api.nullht.com'), 'https://api.nullht.com/v1');
assert.equal(normalizeBaseUrl('https://api.nullht.com/v1'), 'https://api.nullht.com/v1');
assert.equal(normalizeBaseUrl('https://proxy.example.com/'), 'https://proxy.example.com/v1');

// --- empty query guard ---
const empty = await knowsSearch({ source: 'paper_en', query: '   ' });
assert.equal(empty.ok, false);
assert.equal(empty.reason, 'empty_query');

// --- successful search (mocked) records URL + body ---
let calledUrl = '';
let calledBody = null;
globalThis.fetch = async (url, opts) => {
  calledUrl = url;
  calledBody = JSON.parse(opts.body);
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify({
        question_id: 'q-123',
        evidences: [
          {
            id: 'e1',
            title: 'KRAS G12D evidence',
            abstract: 'An abstract.',
            metadata: { journal: 'Nature', doi: '10.1/x', authors: ['A. Author', 'B. Author'] },
            pmid: '40000001'
          }
        ]
      });
    }
  };
};

const res = await knowsSearch({ source: 'trial', query: 'KRAS G12D pancreatic', baseUrl: 'https://api.nullht.com' });
assert.equal(res.ok, true);
assert.equal(res.source, 'trial');
assert.equal(res.questionId, 'q-123');
assert.equal(res.evidences.length, 1);
assert.equal(calledUrl, 'https://api.nullht.com/v1/evidences/ai_search_trial');
assert.deepEqual(calledBody, { query: 'KRAS G12D pancreatic' });

// --- normalization merges metadata + derives url from pmid ---
const norm = normalizeEvidences(res.evidences, 'trial');
assert.equal(norm.length, 1);
assert.equal(norm[0].title, 'KRAS G12D evidence');
assert.equal(norm[0].journal, 'Nature');
assert.equal(norm[0].doi, '10.1/x');
assert.deepEqual(norm[0].authors, ['A. Author', 'B. Author']);
assert.equal(norm[0].url, 'https://pubmed.ncbi.nlm.nih.gov/40000001/');

// --- non-200 -> ok:false, clean fallback ---
globalThis.fetch = async () => ({
  ok: false,
  status: 400,
  async text() {
    return 'bad request';
  }
});
const failed = await knowsSearch({ source: 'guide', query: 'x', retries: 1 });
assert.equal(failed.ok, false);
assert.equal(failed.reason, 'http_400');
assert.equal(failed.evidences.length, 0);

// --- multi-source runs serially and returns one result per source ---
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async text() {
    return JSON.stringify({ question_id: 'q', evidences: [] });
  }
});
const multi = await knowsMultiSearch({ sources: ['paper_en', 'guide'], query: 'KRAS', delayMs: 0 });
assert.equal(multi.length, 2);
assert.equal(multi[0].source, 'paper_en');
assert.equal(multi[1].source, 'guide');

console.log('knows-client.test.mjs: PASS');
