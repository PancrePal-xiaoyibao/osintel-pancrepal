import assert from 'node:assert/strict';
import {
  buildExtractiveDailySummary,
  responseMode,
  unavailableChatResponse
} from '../src/lib/mock-audit.ts';

assert.equal(responseMode('real'), 'real');
assert.equal(responseMode('graceful_fallback'), 'graceful_fallback');
assert.equal(responseMode('demo_only'), 'demo_only');
assert.equal(responseMode('unavailable'), 'unavailable');

const summary = buildExtractiveDailySummary([
  {
    id: 'a',
    title: 'Real PubMed result',
    url: 'https://pubmed.ncbi.nlm.nih.gov/123/',
    source: 'PubMed',
    publishedAt: '2026-07-01T00:00:00.000Z',
    country: 'Global',
    category: 'oncology',
    entities: ['KRAS'],
    importanceScore: 7.2,
    summary: 'A real source-backed abstract excerpt.',
    evidenceLevel: 'B'
  }
], '2026-07-02T00:00:00.000Z');

assert.match(summary, /Real PubMed result/);
assert.match(summary, /graceful_fallback/);
assert.doesNotMatch(summary, /ORR|11\.1|50,000|MRTX1133/);

const unavailable = unavailableChatResponse('No provider configured.');
assert.match(unavailable, /暂不可用/);
assert.match(unavailable, /没有返回模拟医学结论/);
assert.doesNotMatch(unavailable, /KRAS G12D 前沿|胰酶 PERT 标准/);
