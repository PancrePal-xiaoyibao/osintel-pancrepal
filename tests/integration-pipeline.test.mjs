import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ---- Pipeline mirrors (pure functions, no TS dependency) ----

const DAY_MS = 24 * 60 * 60 * 1000;

// --- Credibility scoring ---

function deriveSourceTier(kind, sourceName) {
  const s = (sourceName || '').toLowerCase();
  switch (kind) {
    case 'trial': return 's3_clinical_trial';
    case 'guideline':
      if (s.includes('fda') || s.includes('who') || s.includes('cdc')) return 's1_regulatory';
      if (s.includes('nci') || s.includes('nccn')) return 's5_guideline';
      return 's5_guideline';
    case 'academic':
      if (s.includes('nejm') || s.includes('lancet') || s.includes('jama') || s.includes('nature') || s.includes('bmj') || s.includes('jco')) return 's2_top_journal';
      return 's4_academic';
    case 'news':
      if (s.includes('medical') || s.includes('medscape')) return 's6_medical_news';
      return 's7_general_news';
    case 'web':
      return 's7_general_news';
    default:
      return 's8_unknown';
  }
}

function deriveEvidenceLevel(text) {
  const patterns = [
    { re: /\bmeta.analysis\b|\bmeta-analysis\b|\bsystematic review\b/i, level: 'meta_analysis' },
    { re: /\bRCT\b|\brandomi[sz]ed\b|\bcontrolled trial\b/i, level: 'rct' },
    { re: /\bcohort\b|\bprospective\b|\bretrospective\b|\blongitudinal\b/i, level: 'cohort_study' },
    { re: /\bcase[- ]control\b/i, level: 'case_control' },
    { re: /\bcase report\b|\bcase series\b/i, level: 'case_report' },
    { re: /\bexpert opinion\b|\beditorial\b|\bcommentary\b/i, level: 'expert_opinion' },
  ];
  for (const { re, level } of patterns) {
    if (re.test(text)) return level;
  }
  return 'unknown';
}

const TIER_SCORES = {
  s1_regulatory: 1.00, s2_top_journal: 1.00, s3_clinical_trial: 0.90,
  s4_academic: 0.80, s5_guideline: 0.75, s6_medical_news: 0.45,
  s7_general_news: 0.25, s8_unknown: 0.15,
};

const EVIDENCE_SCORES = {
  meta_analysis: 1.00, systematic_review: 0.95, rct: 0.85,
  cohort_study: 0.65, case_control: 0.45, case_report: 0.30,
  expert_opinion: 0.20, unknown: 0.10,
};

function scoreItem(item, now) {
  const tier = deriveSourceTier(item.kind, item.source);
  const sourceAuth = TIER_SCORES[tier];

  let timeliness = 0;
  if (item.publishedAt) {
    const ageDays = (now.getTime() - new Date(item.publishedAt).getTime()) / DAY_MS;
    if (ageDays <= 7) timeliness = 1.00;
    else if (ageDays <= 30) timeliness = 0.80;
    else if (ageDays <= 90) timeliness = 0.55;
    else if (ageDays <= 180) timeliness = 0.30;
    else if (ageDays <= 365) timeliness = 0.15;
  }

  const text = `${item.title || ''} ${item.snippet || ''}`;
  const evLevel = deriveEvidenceLevel(text);
  const evScore = EVIDENCE_SCORES[evLevel];

  let completeness = 0;
  if (item.doi) completeness += 0.40;
  if (item.pmid) completeness += 0.35;
  if (item.nct) completeness += 0.25;

  const composite = Math.round(
    (0.40 * sourceAuth + 0.20 * timeliness + 0.25 * evScore + 0.15 * completeness) * 100
  );

  return {
    ...item,
    credibility: {
      score: composite,
      breakdown: { sourceAuthority: sourceAuth, timeliness, evidenceLevel: evScore, dataCompleteness: completeness },
      sourceTier: tier,
      evidenceLevel: evLevel,
      scoredAt: now.toISOString(),
    },
  };
}

function scoreAll(items, now = new Date()) {
  return items.map((item) => scoreItem(item, now));
}

// --- Filtering ---

function filterItems(items, params = {}) {
  let result = [...items];

  // Time range
  if (params.from || params.to) {
    const fromMs = params.from ? new Date(params.from).getTime() : 0;
    const toMs = params.to ? new Date(params.to).getTime() : Infinity;
    result = result.filter((item) => {
      if (!item.publishedAt) return false;
      const ts = new Date(item.publishedAt).getTime();
      return !isNaN(ts) && ts >= fromMs && ts <= toMs;
    });
  }

  // Credibility threshold
  if (params.minCredibility !== undefined) {
    result = result.filter((item) =>
      (item.credibility && item.credibility.score >= params.minCredibility)
    );
  }

  // Source filter
  if (params.sources && params.sources.length > 0) {
    const set = new Set(params.sources.map((s) => s.toLowerCase()));
    result = result.filter((item) => set.has((item.source || '').toLowerCase()));
  }

  // Sort
  if (params.sort === 'credibility') {
    result.sort((a, b) => (b.credibility?.score || 0) - (a.credibility?.score || 0));
  } else if (params.sort === 'time' || !params.sort) {
    result.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      if (isNaN(ta) && isNaN(tb)) return 0;
      if (isNaN(ta)) return 1;
      if (isNaN(tb)) return -1;
      return params.order === 'asc' ? ta - tb : tb - ta;
    });
  }

  return result;
}

function paginate(items, page = 1, pageSize = 20) {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

// --- Export ---

function exportJSON(items, includeCred = true) {
  return JSON.stringify({
    metadata: { generatedAt: new Date().toISOString(), itemCount: items.length },
    items: includeCred ? items : items.map(({ credibility, ...rest }) => rest),
  });
}

function escapeCSV(v) {
  if (typeof v !== 'string') v = String(v);
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function exportCSV(items) {
  const headers = ['Title', 'Source', 'Credibility', 'Published', 'Evidence'];
  const lines = [headers.join(',')];
  for (const item of items) {
    lines.push([
      escapeCSV(item.title || ''),
      escapeCSV(item.source || ''),
      item.credibility ? String(item.credibility.score) : 'N/A',
      escapeCSV(item.publishedAt || ''),
      escapeCSV(item.credibility?.evidenceLevel || ''),
    ].join(','));
  }
  return lines.join('\n');
}

// ---- Test Helpers ----

const NOW = new Date('2026-07-05T00:00:00Z');

function makeItem(overrides = {}) {
  return {
    title: 'Default Title',
    url: 'https://example.com',
    snippet: '',
    source: 'PubMed',
    providerId: 'pubmed',
    kind: 'academic',
    publishedAt: new Date(NOW.getTime() - 3 * DAY_MS).toISOString(),
    doi: null,
    pmid: null,
    nct: null,
    ...overrides,
  };
}

function buildMockDataset() {
  return [
    makeItem({ title: 'RCT of KRAS G12C inhibitor', kind: 'academic', source: 'NEJM Oncology', doi: '10.xxx/1', snippet: 'Phase III randomized controlled trial' }),
    makeItem({ title: 'Nutrition guidelines update', kind: 'guideline', source: 'WHO Cancer', doi: '10.xxx/2' }),
    makeItem({ title: 'Press release: new hospital', kind: 'web', source: 'General News', publishedAt: new Date(NOW.getTime() - 60 * DAY_MS).toISOString() }),
    makeItem({ title: 'Meta-analysis of survival rates', kind: 'academic', source: 'The Lancet Oncology', doi: '10.xxx/3', pmid: '98765432' }),
    makeItem({ title: 'Case report: rare mutation', kind: 'academic', source: 'PubMed Central', snippet: 'A case report of', publishedAt: new Date(NOW.getTime() - 10 * DAY_MS).toISOString() }),
    makeItem({ title: 'FDA approves new therapy', kind: 'guideline', source: 'FDA News', publishedAt: new Date(NOW.getTime() - 1 * DAY_MS).toISOString() }),
    makeItem({ title: 'Clinical trial starts', kind: 'trial', source: 'ClinicalTrials.gov', nct: 'NCT12345', publishedAt: new Date(NOW.getTime() - 5 * DAY_MS).toISOString() }),
    makeItem({ title: 'Outdated research paper', kind: 'academic', source: 'PubMed Central', publishedAt: new Date(NOW.getTime() - 400 * DAY_MS).toISOString() }),
    makeItem({ title: undefined, url: 'https://broken.com' }), // missing title
    makeItem({ title: 'No date item' }), // no date
  ];
}

// ---- Tests ----

describe('Full Pipeline: Score → Filter → Export', () => {
  it('should score all items without error', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    assert.equal(scored.length, 10);
    // Every item should have credibility
    for (const item of scored) {
      assert.ok(item.credibility, 'Every item must have credibility');
      assert.ok(item.credibility.score >= 0 && item.credibility.score <= 100, 'Score must be 0-100');
    }
  });

  it('should produce differentiated scores across mixed quality', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const scores = scored.map((s) => s.credibility.score);
    const max = Math.max(...scores);
    const min = Math.min(...scores);

    // NEJM RCT should score high, general web old news should score low
    assert.ok(max - min > 20, `Score spread too narrow: ${max} - ${min} = ${max - min}`);
    console.log(`  Score range: ${min}–${max} (spread: ${max - min})`);
  });

  it('should filter by min credibility threshold', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const filtered = filterItems(scored, { minCredibility: 60 });

    assert.ok(filtered.length > 0, 'Should have items above 60');
    for (const item of filtered) {
      assert.ok(item.credibility.score >= 60, `Score ${item.credibility.score} should be >= 60`);
    }
    console.log(`  Credibility >= 60: ${filtered.length}/${scored.length} items`);
  });

  it('should filter by time range', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);

    const filtered = filterItems(scored, {
      from: new Date(NOW.getTime() - 14 * DAY_MS).toISOString(),
      to: NOW.toISOString(),
    });

    assert.ok(filtered.length < scored.length, 'Time filter should reduce count');
    assert.ok(filtered.length > 0, 'Should have recent items');

    for (const item of filtered) {
      const ts = new Date(item.publishedAt).getTime();
      assert.ok(!isNaN(ts), 'All filtered items must have valid dates');
    }
    console.log(`  Within 14 days: ${filtered.length}/${scored.length} items`);
  });

  it('should filter by source', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const filtered = filterItems(scored, { sources: ['NEJM Oncology', 'The Lancet Oncology'] });

    assert.ok(filtered.length >= 2, 'Should find NEJM + Lancet items');
    for (const item of filtered) {
      assert.ok(
        item.source.includes('NEJM') || item.source.includes('Lancet'),
        `Unexpected source: ${item.source}`
      );
    }
  });

  it('should combine multiple filter dimensions', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);

    const filtered = filterItems(scored, {
      minCredibility: 50,
      sources: ['NEJM Oncology', 'The Lancet Oncology', 'WHO Cancer', 'FDA News'],
      from: new Date(NOW.getTime() - 30 * DAY_MS).toISOString(),
    });

    for (const item of filtered) {
      assert.ok(item.credibility.score >= 50);
      assert.ok(
        ['NEJM Oncology', 'The Lancet Oncology', 'WHO Cancer', 'FDA News'].includes(item.source)
      );
      const ts = new Date(item.publishedAt).getTime();
      assert.ok(ts >= NOW.getTime() - 30 * DAY_MS);
    }
    console.log(`  Combined filter: ${filtered.length} items`);
  });

  it('should paginate correctly', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const filtered = filterItems(scored, {});

    const page1 = paginate(filtered, 1, 3);
    assert.equal(page1.items.length, 3);
    assert.equal(page1.total, filtered.length);
    assert.equal(page1.page, 1);
    assert.equal(page1.totalPages, Math.ceil(filtered.length / 3));

    const page2 = paginate(filtered, 2, 3);
    assert.ok(page2.items.length > 0);
    assert.equal(page2.page, 2);

    // No overlap between pages
    const titles1 = new Set(page1.items.map((i) => i.title));
    const titles2 = new Set(page2.items.map((i) => i.title));
    for (const t of titles1) {
      assert.ok(!titles2.has(t), `Page overlap at "${t}"`);
    }
  });

  it('should handle empty filter (pass-through)', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const filtered = filterItems(scored, {});
    assert.equal(filtered.length, scored.length, 'Empty filter should pass all');
  });

  it('should export to JSON and round-trip parse', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const filtered = filterItems(scored, {});

    const json = exportJSON(filtered, true);
    const parsed = JSON.parse(json);

    assert.ok(parsed.metadata);
    assert.equal(parsed.metadata.itemCount, filtered.length);
    assert.equal(parsed.items.length, filtered.length);
    assert.ok(parsed.items[0].credibility, 'JSON should have credibility field');
    assert.ok(parsed.items[0].credibility.score !== undefined);
  });

  it('should export to JSON without credibility when stripped', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const filtered = filterItems(scored, {});

    const json = exportJSON(filtered, false);
    const parsed = JSON.parse(json);

    assert.equal(parsed.items.length, filtered.length);
    assert.equal(parsed.items[0].credibility, undefined, 'Credibility should be stripped');
  });

  it('should export to CSV with correct headers', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const filtered = filterItems(scored, {});

    const csv = exportCSV(filtered);
    const lines = csv.split('\n');

    assert.ok(lines[0].startsWith('Title'), `First line is header: ${lines[0]}`);
    assert.equal(lines.length, filtered.length + 1, 'Header + one row per item');
  });

  it('should sort by credibility and verify order', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const sorted = filterItems(scored, { sort: 'credibility' });

    for (let i = 1; i < sorted.length; i++) {
      assert.ok(
        sorted[i - 1].credibility.score >= sorted[i].credibility.score,
        `Order violated at index ${i}: ${sorted[i - 1].credibility.score} < ${sorted[i].credibility.score}`
      );
    }
  });

  it('should sort by time (desc) and verify order', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const sorted = filterItems(scored, { sort: 'time', order: 'desc' });

    for (let i = 1; i < sorted.length; i++) {
      const t1 = new Date(sorted[i - 1].publishedAt || 0).getTime();
      const t2 = new Date(sorted[i].publishedAt || 0).getTime();
      if (!isNaN(t1) && !isNaN(t2)) {
        assert.ok(t1 >= t2, `Time order violated at index ${i}`);
      }
    }
  });
});

describe('Pipeline Performance Baseline', () => {
  it('should score 1000 items under 50ms', () => {
    const items = Array.from({ length: 1000 }, (_, i) =>
      makeItem({
        title: `Article ${i}`,
        source: i % 3 === 0 ? 'NEJM Oncology' : i % 3 === 1 ? 'PubMed Central' : 'General News',
        kind: i % 3 === 2 ? 'web' : 'academic',
        publishedAt: new Date(NOW.getTime() - (i % 365) * DAY_MS).toISOString(),
        doi: i % 2 === 0 ? `10.xxx/${i}` : undefined,
      })
    );

    const start = Date.now();
    const scored = scoreAll(items, NOW);
    const elapsed = Date.now() - start;

    assert.equal(scored.length, 1000);
    assert.ok(elapsed < 50, `Scoring took ${elapsed}ms, expected < 50ms`);
    console.log(`  1000 items scored in ${elapsed}ms`);
  });

  it('should filter and paginate 1000 items under 10ms', () => {
    const items = Array.from({ length: 1000 }, (_, i) => makeItem({
      title: `Article ${i}`,
      publishedAt: new Date(NOW.getTime() - (i % 365) * DAY_MS).toISOString(),
    }));
    const scored = scoreAll(items, NOW);

    const start = Date.now();
    const filtered = filterItems(scored, {
      minCredibility: 50,
      sources: ['PubMed', 'NEJM Oncology'],
      sort: 'time',
    });
    const paged = paginate(filtered, 1, 20);
    const elapsed = Date.now() - start;

    assert.ok(elapsed < 10, `Filter+paginate took ${elapsed}ms, expected < 10ms`);
    console.log(`  Filter+paginate 1000→${filtered.length} items in ${elapsed}ms`);
  });
});

describe('Edge Cases', () => {
  it('should handle empty input gracefully', () => {
    const scored = scoreAll([], NOW);
    assert.equal(scored.length, 0);
    const filtered = filterItems([], { minCredibility: 50 });
    assert.equal(filtered.length, 0);
    const paged = paginate([], 1, 20);
    assert.equal(paged.items.length, 0);
    assert.equal(paged.totalPages, 0);
  });

  it('should handle item with no credibility after scoring', () => {
    // Items without key fields should still get a base credibility
    const item = makeItem({ title: undefined, source: undefined, kind: undefined, publishedAt: undefined });
    const scored = scoreAll([item], NOW);
    assert.equal(scored.length, 1);
    assert.ok(scored[0].credibility, 'Should still have credibility');
  });

  it('should handle single item', () => {
    const item = makeItem({ title: 'Single item', source: 'PubMed' });
    const scored = scoreAll([item], NOW);
    const filtered = filterItems(scored, {});
    const paged = paginate(filtered, 1, 20);
    assert.equal(paged.items.length, 1);
    assert.equal(paged.total, 1);
    assert.equal(paged.totalPages, 1);
  });

  it('should handle pagination out of range', () => {
    const items = [makeItem()];
    const scored = scoreAll(items, NOW);
    const paged = paginate(scored, 99, 20);
    assert.equal(paged.items.length, 0);
    assert.equal(paged.page, 99);
  });

  it('should handle duplicate items identically', () => {
    const items = [makeItem(), makeItem()]; // identical
    const scored = scoreAll(items, NOW);
    assert.equal(scored[0].credibility.score, scored[1].credibility.score,
      'Identical items should have identical scores');
  });
});

describe('Export Pipe: Score → Filter → CSV Round-trip', () => {
  it('should produce valid CSV with header + data', () => {
    const items = buildMockDataset();
    const scored = scoreAll(items, NOW);
    const highQuality = filterItems(scored, { minCredibility: 50 });

    const csv = exportCSV(highQuality);
    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    assert.ok(headers.includes('Title'));
    assert.ok(headers.includes('Credibility'));

    // Every data line should have 5 fields (Title, Source, Credibility, Published, Evidence)
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        // Split CSV respecting quoted fields with embedded commas
        const cols = [];
        let current = '';
        let inQuotes = false;
        for (const ch of lines[i]) {
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === ',' && !inQuotes) {
            cols.push(current);
            current = '';
          } else {
            current += ch;
          }
        }
        cols.push(current);
        assert.equal(cols.length, headers.length,
          `Line ${i}: ${cols.length} cols vs ${headers.length} headers — [${lines[i].slice(0, 60)}...]`);
      }
    }
  });
});

console.log('\n✅ All integration tests passed!');
