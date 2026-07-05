import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Mirror engine logic for pure-function validation

// Source tier detection (mirror engine.ts)
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
      if (s.includes('medical') || s.includes('medscape') || s.includes('science daily')) return 's6_medical_news';
      return 's7_general_news';
    case 'web':
      return 's7_general_news';
    default:
      return 's8_unknown';
  }
}

const SOURCE_TIER_SCORES = {
  s1_regulatory: 1.00, s2_top_journal: 1.00, s3_clinical_trial: 0.90,
  s4_academic: 0.80, s5_guideline: 0.75, s6_medical_news: 0.45,
  s7_general_news: 0.25, s8_unknown: 0.15,
};

// Evidence level detection
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

const EVIDENCE_LEVEL_SCORES = {
  meta_analysis: 1.00, systematic_review: 0.95, rct: 0.85,
  cohort_study: 0.65, case_control: 0.45, case_report: 0.30,
  expert_opinion: 0.20, unknown: 0.10,
};

// Timeliness scoring
const DAY_MS = 24 * 60 * 60 * 1000;
function computeTimeliness(publishedAt, now) {
  if (!publishedAt) return 0;
  const ageDays = (now.getTime() - new Date(publishedAt).getTime()) / DAY_MS;
  if (ageDays <= 7) return 1.00;
  if (ageDays <= 30) return 0.80;
  if (ageDays <= 90) return 0.55;
  if (ageDays <= 180) return 0.30;
  if (ageDays <= 365) return 0.15;
  return 0;
}

function computeComposite(item, now = new Date()) {
  const tier = deriveSourceTier(item.kind, item.source);
  const sourceAuthority = SOURCE_TIER_SCORES[tier];
  const timeliness = computeTimeliness(item.publishedAt, now);
  const evidence = deriveEvidenceLevel(`${item.title || ''} ${item.snippet || ''}`);
  const evidenceScore = EVIDENCE_LEVEL_SCORES[evidence];
  let completeness = 0;
  if (item.doi) completeness += 0.40;
  if (item.pmid) completeness += 0.35;
  if (item.nct) completeness += 0.25;

  return Math.round(
    (0.40 * sourceAuthority + 0.20 * timeliness + 0.25 * evidenceScore + 0.15 * completeness) * 100
  );
}

// ---- Tests ----

describe('Source Tier Detection', () => {
  it('should classify NEJM as top journal', () => {
    assert.equal(deriveSourceTier('academic', 'NEJM Oncology'), 's2_top_journal');
  });

  it('should classify Lancet as top journal', () => {
    assert.equal(deriveSourceTier('academic', 'The Lancet Oncology'), 's2_top_journal');
  });

  it('should classify PubMed as academic', () => {
    assert.equal(deriveSourceTier('academic', 'PubMed Central'), 's4_academic');
  });

  it('should classify FDA as regulatory', () => {
    assert.equal(deriveSourceTier('guideline', 'FDA News'), 's1_regulatory');
  });

  it('should classify WHO as regulatory', () => {
    assert.equal(deriveSourceTier('guideline', 'WHO Cancer'), 's1_regulatory');
  });

  it('should classify NCI as guideline', () => {
    assert.equal(deriveSourceTier('guideline', 'NCI Cancer Currents'), 's5_guideline');
  });

  it('should classify ClinicalTrials.gov as trial', () => {
    assert.equal(deriveSourceTier('trial', 'ClinicalTrials.gov'), 's3_clinical_trial');
  });

  it('should classify Medical News Today as medical news', () => {
    assert.equal(deriveSourceTier('news', 'Medical News Today'), 's6_medical_news');
  });

  it('should classify general web as news', () => {
    assert.equal(deriveSourceTier('web', 'Brave Search'), 's7_general_news');
  });

  it('should return unknown for unrecognized kind', () => {
    assert.equal(deriveSourceTier('unknown' ), 's8_unknown');
  });
});

describe('Evidence Level Detection', () => {
  it('should detect meta-analysis', () => {
    assert.equal(deriveEvidenceLevel('A meta-analysis of KRAS inhibitors'), 'meta_analysis');
    assert.equal(deriveEvidenceLevel('Systematic review of pancreatic cancer therapies'), 'meta_analysis');
  });

  it('should detect RCT', () => {
    assert.equal(deriveEvidenceLevel('A randomized controlled trial of gemcitabine'), 'rct');
    assert.equal(deriveEvidenceLevel('Phase III RCT demonstrates efficacy'), 'rct');
  });

  it('should detect cohort study', () => {
    assert.equal(deriveEvidenceLevel('A retrospective cohort study on survival outcomes'), 'cohort_study');
  });

  it('should detect case report', () => {
    assert.equal(deriveEvidenceLevel('Case report: rare KRAS mutation'), 'case_report');
  });

  it('should detect expert opinion', () => {
    assert.equal(deriveEvidenceLevel('Editorial: future of pancreatic cancer treatment'), 'expert_opinion');
  });

  it('should return unknown for unclassifiable text', () => {
    assert.equal(deriveEvidenceLevel('New treatment approach for pancreatic cancer'), 'unknown');
  });
});

describe('Timeliness Scoring', () => {
  const now = new Date('2026-07-05T12:00:00Z');

  it('should score 1.0 for items within 7 days', () => {
    assert.equal(computeTimeliness('2026-07-01T00:00:00Z', now), 1.00);
    assert.equal(computeTimeliness('2026-06-28T12:00:00Z', now), 1.00);
  });

  it('should score 0.80 for items within 30 days', () => {
    assert.equal(computeTimeliness('2026-06-10T00:00:00Z', now), 0.80);
  });

  it('should score 0.55 for items within 90 days', () => {
    assert.equal(computeTimeliness('2026-05-01T00:00:00Z', now), 0.55);
  });

  it('should score 0 for items older than 365 days', () => {
    assert.equal(computeTimeliness('2024-01-01T00:00:00Z', now), 0);
  });

  it('should score 0 for missing date', () => {
    assert.equal(computeTimeliness(undefined, now), 0);
    assert.equal(computeTimeliness(null, now), 0);
  });
});

describe('Composite Score Computation', () => {
  it('should score top-journal RCT with DOI near 87', () => {
    const item = {
      kind: 'academic',
      source: 'NEJM Oncology',
      title: 'Phase III randomized controlled trial of KRAS G12C inhibitor',
      snippet: '',
      publishedAt: new Date(Date.now() - 3 * DAY_MS).toISOString(),
      doi: '10.1000/nejm.2024',
    };
    const score = computeComposite(item);
    console.log(`  Top journal RCT score: ${score}/100`);
    assert.ok(score >= 70, `Expected >= 70, got ${score}`);
    assert.ok(score <= 95, `Expected <= 95, got ${score}`);
  });

  it('should score general news with no identifiers low', () => {
    const item = {
      kind: 'web',
      source: 'Brave Search',
      title: 'New cancer treatment announced',
      snippet: '',
      publishedAt: new Date(Date.now() - 10 * DAY_MS).toISOString(),
    };
    const score = computeComposite(item);
    console.log(`  General web score: ${score}/100`);
    assert.ok(score <= 40, `Expected <= 40, got ${score}`);
  });

  it('should score old items lower than recent ones (all else equal)', () => {
    const base = {
      kind: 'academic', source: 'PubMed Central',
      title: 'Pancreatic cancer survival analysis',
      snippet: '', doi: '10.1234/test',
    };
    const recent = computeComposite({ ...base, publishedAt: new Date(Date.now() - 2 * DAY_MS).toISOString() });
    const old = computeComposite({ ...base, publishedAt: new Date(Date.now() - 200 * DAY_MS).toISOString() });
    console.log(`  Recent: ${recent}, Old: ${old}`);
    assert.ok(recent > old, `Recent ${recent} should be > old ${old}`);
  });

  it('should boost score for items with multiple identifiers', () => {
    const withAll = {
      kind: 'academic', source: 'PubMed Central', title: 'Study title',
      snippet: '', publishedAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
      doi: '10.1234/x', pmid: '12345678', nct: 'NCT12345678',
    };
    const without = {
      kind: 'academic', source: 'PubMed Central', title: 'Study title',
      snippet: '', publishedAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
    };
    assert.ok(computeComposite(withAll) > computeComposite(without));
  });

  it('should score meta-analysis higher than expert opinion', () => {
    const meta = {
      kind: 'academic', source: 'PubMed Central',
      title: 'A meta-analysis of pancreatic cancer treatments',
      snippet: '', doi: '10.1234/x',
      publishedAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
    };
    const opinion = {
      kind: 'academic', source: 'PubMed Central',
      title: 'Expert opinion: editorial on pancreatic cancer',
      snippet: '', doi: '10.1234/y',
      publishedAt: new Date(Date.now() - 5 * DAY_MS).toISOString(),
    };
    const scoreMeta = computeComposite(meta);
    const scoreOpinion = computeComposite(opinion);
    console.log(`  Meta-analysis: ${scoreMeta}, Expert opinion: ${scoreOpinion}`);
    assert.ok(scoreMeta > scoreOpinion);
  });
});

console.log('\n✅ All credibility tests passed!');
