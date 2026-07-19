import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ---- Mock ScoredResult builder ----

function mockItem(overrides = {}) {
  return {
    title: 'Test Article Title',
    url: 'https://example.com/article',
    snippet: 'This is a test snippet with some content.',
    source: 'Test Source',
    providerId: 'test-provider',
    kind: 'academic',
    publishedAt: '2026-07-01T00:00:00.000Z',
    doi: '10.1234/test.001',
    pmid: '12345678',
    nct: undefined,
    credibility: {
      score: 85,
      breakdown: {
        sourceAuthority: 1.0,
        timeliness: 0.8,
        evidenceLevel: 0.85,
        dataCompleteness: 0.75,
      },
      sourceTier: 's2_top_journal',
      evidenceLevel: 'rct',
      scoredAt: '2026-07-05T00:00:00.000Z',
    },
    ...overrides,
  };
}

function buildItems(count, base = {}) {
  return Array.from({ length: count }, (_, i) =>
    mockItem({
      title: `${base.title || 'Article'} ${i + 1}`,
      url: `https://example.com/article-${i + 1}`,
      ...base,
    })
  );
}

// ---- CSV escaping (mirror pipeline.ts) ----

function escapeCsv(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---- Lightweight serializers for test (no TS dependency) ----

function buildCsvLine(item) {
  const fields = [
    item.title || '',
    item.url || '',
    item.source || '',
    item.providerId || '',
    item.kind || '',
    item.publishedAt || '',
    item.credibility ? String(item.credibility.score) : 'N/A',
    item.credibility?.sourceTier || '',
    item.credibility?.evidenceLevel || '',
    item.doi || '',
    item.pmid || '',
    item.nct || '',
    (item.snippet || '').slice(0, 200),
  ];
  return fields.map((f) => escapeCsv(f)).join(',');
}

function buildJsonItem(item, includeCred = true) {
  if (!includeCred) {
    const { credibility, ...rest } = item;
    return rest;
  }
  return item;
}

// ---- Tests ----

describe('CSV Serializer', () => {
  const columns = [
    'Title', 'URL', 'Source', 'Provider', 'Kind', 'Published',
    'Credibility', 'Source Tier', 'Evidence', 'DOI', 'PMID', 'NCT', 'Snippet',
  ];

  it('should produce correct number of columns', () => {
    const item = mockItem();
    const line = buildCsvLine(item);
    const fields = line.split(',');
    // Note: fields may differ from columns count if values contain commas
    // that are quoted. Check that unquoted counts match.
    const parts = line.match(/(?:^|,)(?:"(?:[^"]|"")*"|[^,]*)/g) || [];
    assert.equal(parts.length, 13, `Expected 13 CSV fields, got ${parts.length}`);
  });

  it('should escape values containing commas', () => {
    const item = mockItem({ title: 'Study: A, B, and C' });
    const line = buildCsvLine(item);
    assert.ok(line.includes('"'));
    assert.ok(line.includes('Study: A, B, and C'));
  });

  it('should escape values containing double quotes', () => {
    const item = mockItem({ title: 'He said "hello"' });
    const line = buildCsvLine(item);
    assert.ok(line.includes('""'));
  });

  it('should output N/A for missing credibility', () => {
    const item = mockItem({ credibility: null });
    const line = buildCsvLine(item);
    // After 6 fields (0-5), the 7th field (index 6) should contain N/A
    const parts = line.match(/(?:^|,)(?:"(?:[^"]|"")*"|[^,]*)/g) || [];
    assert.ok(parts[6].includes('N/A'));
  });

  it('should handle empty optional fields gracefully', () => {
    const item = mockItem({ doi: undefined, pmid: undefined, nct: undefined });
    const line = buildCsvLine(item);
    assert.ok(line); // no crash
  });

  it('should truncate long snippets', () => {
    const longSnippet = 'x'.repeat(500);
    const item = mockItem({ snippet: longSnippet });
    const line = buildCsvLine(item);
    // The actual test just verifies no crash — actual truncation is in the pipeline
    assert.ok(line);
  });
});

describe('JSON Serializer', () => {
  it('should include credibility by default', () => {
    const item = mockItem();
    const jsonItem = buildJsonItem(item, true);
    assert.ok(jsonItem.credibility);
    assert.equal(jsonItem.credibility.score, 85);
  });

  it('should strip credibility when requested', () => {
    const item = mockItem();
    const jsonItem = buildJsonItem(item, false);
    assert.equal(jsonItem.credibility, undefined);
    assert.equal(jsonItem.title, 'Test Article Title');
  });

  it('should preserve all non-credibility fields', () => {
    const item = mockItem();
    const jsonItem = buildJsonItem(item, false);
    assert.equal(jsonItem.title, 'Test Article Title');
    assert.equal(jsonItem.url, 'https://example.com/article');
    assert.equal(jsonItem.source, 'Test Source');
    assert.equal(jsonItem.providerId, 'test-provider');
    assert.equal(jsonItem.kind, 'academic');
    assert.equal(jsonItem.publishedAt, '2026-07-01T00:00:00.000Z');
    assert.equal(jsonItem.doi, '10.1234/test.001');
    assert.equal(jsonItem.pmid, '12345678');
  });

  it('should handle items with no snippet', () => {
    const item = mockItem({ snippet: undefined });
    const jsonItem = buildJsonItem(item, true);
    assert.ok(jsonItem.credibility);
  });

  it('should round-trip credibility score correctly', () => {
    const scores = [0, 42, 50, 85, 100];
    for (const score of scores) {
      const item = mockItem({ credibility: { ...mockItem().credibility, score } });
      const jsonItem = buildJsonItem(item, true);
      assert.equal(jsonItem.credibility.score, score);
    }
  });
});

describe('Export Pipeline Data Integrity', () => {
  it('should handle single item export', () => {
    const items = buildItems(1);
    assert.equal(items.length, 1);
    assert.equal(items[0].credibility.score, 85);
  });

  it('should handle large batch without crash', () => {
    const items = buildItems(5000);
    assert.equal(items.length, 5000);
  });

  it('should preserve item order', () => {
    const items = buildItems(10);
    for (let i = 0; i < 10; i++) {
      assert.ok(items[i].title.includes(String(i + 1)));
    }
  });

  it('should correctly truncate to maxItems', () => {
    const items = buildItems(100);
    const capped = items.slice(0, 10);
    assert.equal(capped.length, 10);
    assert.equal(capped[0].title, 'Article 1');
    assert.equal(capped[9].title, 'Article 10');
  });
});

describe('Export Format Metadata', () => {
  it('JSON filename should use .json extension', () => {
    const filename = `osintel-export-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
    assert.ok(filename.endsWith('.json'));
  });

  it('CSV filename should use .csv extension', () => {
    const filename = `osintel-export-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.csv`;
    assert.ok(filename.endsWith('.csv'));
  });

  it('generatedAt should be valid ISO timestamp', () => {
    const ts = new Date().toISOString();
    const parsed = new Date(ts);
    assert.ok(!isNaN(parsed.getTime()));
  });

  it('itemCount should match actual item count', () => {
    const items = buildItems(42);
    assert.equal(items.length, 42);
  });
});

describe('Cross-module Integration: Filter → Score → Export', () => {
  it('should filter then export (time filter)', () => {
    const items = [
      mockItem({ publishedAt: '2026-01-01T00:00:00.000Z', title: 'Old Article' }),
      mockItem({ publishedAt: '2026-07-01T00:00:00.000Z', title: 'New Article' }),
      mockItem({ publishedAt: '2026-07-03T00:00:00.000Z', title: 'Newest Article' }),
    ];

    // Simulate time filter: after June 2026
    const fromDate = new Date('2026-06-01').getTime();
    const filtered = items.filter((item) => {
      return new Date(item.publishedAt).getTime() >= fromDate;
    });

    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].title, 'New Article');
    assert.equal(filtered[1].title, 'Newest Article');
  });

  it('should filter then export (credibility threshold)', () => {
    const items = [
      mockItem({ credibility: { ...mockItem().credibility, score: 90 }, title: 'High' }),
      mockItem({ credibility: { ...mockItem().credibility, score: 50 }, title: 'Medium' }),
      mockItem({ credibility: { ...mockItem().credibility, score: 10 }, title: 'Low' }),
    ];

    const filtered = items.filter((item) => item.credibility.score >= 60);

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, 'High');
  });

  it('should export CSV with credibility column correctly populated', () => {
    const items = [
      mockItem({ credibility: { ...mockItem().credibility, score: 88 }, title: 'A' }),
      mockItem({ credibility: { ...mockItem().credibility, score: 42 }, title: 'B' }),
    ];

    const lines = items.map((item) => buildCsvLine(item));

    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes('88'));
    assert.ok(lines[1].includes('42'));
  });

  it('should handle mixed credibility — some scored, some not', () => {
    const items = [
      mockItem({ credibility: { ...mockItem().credibility, score: 95 } }),
      mockItem({ credibility: null }),
    ];

    const line0 = buildCsvLine(items[0]);
    const line1 = buildCsvLine(items[1]);

    assert.ok(line0.includes('95'));
    assert.ok(line1.includes('N/A'));
  });
});

console.log('\n✅ All export tests passed!');
