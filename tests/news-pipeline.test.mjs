import assert from 'node:assert/strict';
import {
  buildNewsRefreshWindow,
  normalizeKnowsEvidencePayload,
  scoreNewsItem,
  summarizeNewsWindow
} from '../src/lib/news/pipeline.ts';

const now = new Date('2026-06-26T12:00:00.000Z');

const knowsPayload = {
  query: 'What evidence supports NPM1 mutation as a therapeutic predictor in MDS?',
  results: [
    {
      title: 'Pancreatic center publishes KRAS G12D trial update',
      url: 'https://example.org/a',
      source: 'Center A',
      publishedAt: '2026-06-26T11:00:00.000Z',
      evidenceLevel: 'A',
      topicTags: ['trial', 'drug'],
      contentTags: ['center-first', 'clinical'],
      summary: 'center update',
      centerPriority: true
    }
  ]
};

const normalized = normalizeKnowsEvidencePayload(knowsPayload, {
  sourceKey: 'knows',
  windowLabel: '24h',
  observedAt: now.toISOString()
});

assert.equal(normalized.length, 1);
assert.equal(normalized[0].sourceKey, 'knows');
assert.equal(normalized[0].centerPriority, true);
assert.equal(normalized[0].windowLabel, '24h');

const scored = scoreNewsItem({
  title: 'Center update on KRAS trial',
  sourceTitle: 'Pancreatic Center',
  topicTags: ['trial', 'drug'],
  contentTags: ['center-first'],
  centerPriority: true,
  publishedAt: '2026-06-26T11:00:00.000Z',
  observedAt: '2026-06-26T12:00:00.000Z',
  freshnessMinutes: 60,
  evidenceLevel: 'A'
});

assert.ok(scored.priorityScore > 0);
assert.equal(scored.isCenterFirst, true);

const windowed = buildNewsRefreshWindow({
  items: [
    { ...normalized[0], itemKey: 'a', priorityScore: 10 },
    {
      ...normalized[0],
      itemKey: 'b',
      title: 'Psychology support note',
      topicTags: ['psychology'],
      contentTags: ['support'],
      centerPriority: false,
      priorityScore: 3,
      dedupeKey: 'dup'
    }
  ],
  freshnessWindows: ['24h', '30d']
});

assert.equal(windowed.windows.length, 2);
assert.ok(windowed.windows[0].items.length >= 1);

const summary = summarizeNewsWindow(windowed.windows[0]);
assert.match(summary, /24h|center/i);

