import type { SearchResult, SearchKind } from '../search/types';
import type {
  SourceTier,
  EvidenceLevel,
  CredibilityBreakdown,
  CredibilityWeights,
  CredibilityScore,
  ScoredResult,
  ScoringContext,
  CredibilityEngine,
  SourceTierMap,
} from './types';

// ---- Default Weights ----

const DEFAULT_WEIGHTS: CredibilityWeights = {
  sourceAuthority: 0.40,
  timeliness: 0.20,
  evidenceLevel: 0.25,
  dataCompleteness: 0.15,
};

// ---- Source Tier Map ----

/**
 * Map SearchKind + source name patterns → SourceTier.
 * Ordered: first match wins. Fallback is 's8_unknown'.
 */
const DEFAULT_TIER_MAP: SourceTierMap = {};

/** Derive source tier from SearchResult fields */
export function deriveSourceTier(
  item: SearchResult,
  overrides?: SourceTierMap
): SourceTier {
  const sourceName = (item.source || '').toLowerCase();
  const providerId = (item.providerId || '').toLowerCase();
  const matchKey = `${sourceName}|${providerId}|${item.kind}`;

  // Check overrides first
  if (overrides) {
    for (const [pattern, tier] of Object.entries(overrides)) {
      if (matchKey.includes(pattern.toLowerCase()) || sourceName.includes(pattern.toLowerCase())) {
        return tier;
      }
    }
  }

  // SearchKind-based heuristics
  switch (item.kind) {
    case 'trial':
      return 's3_clinical_trial';
    case 'guideline':
      // Distinguish regulatory from general guidelines
      if (sourceName.includes('fda') || sourceName.includes('who') || sourceName.includes('cdc') || sourceName.includes('nmpa')) {
        return 's1_regulatory';
      }
      if (sourceName.includes('nci') || sourceName.includes('nccn')) {
        return 's5_guideline';
      }
      return 's5_guideline';
    case 'academic':
      // Top journal vs general academic
      if (
        sourceName.includes('nejm') ||
        sourceName.includes('lancet') ||
        sourceName.includes('jama') ||
        sourceName.includes('nature') ||
        sourceName.includes('bmj') ||
        sourceName.includes('jco') ||
        sourceName.includes('cell') ||
        sourceName.includes('science')
      ) {
        return 's2_top_journal';
      }
      return 's4_academic';
    case 'news':
      if (sourceName.includes('medical') || sourceName.includes('medscape') || sourceName.includes('science daily')) {
        return 's6_medical_news';
      }
      return 's7_general_news';
    case 'web':
      return 's7_general_news';
    default:
      return 's8_unknown';
  }
}

// ---- Source Authority Score ----

const SOURCE_TIER_SCORES: Record<SourceTier, number> = {
  s1_regulatory:      1.00,
  s2_top_journal:     1.00,
  s3_clinical_trial:  0.90,
  s4_academic:        0.80,
  s5_guideline:       0.75,
  s6_medical_news:    0.45,
  s7_general_news:    0.25,
  s8_unknown:         0.15,
};

// ---- Timeliness Score ----

const DAY_MS = 24 * 60 * 60 * 1000;

const TIMELINESS_BANDS: Array<{ maxDays: number; score: number }> = [
  { maxDays: 7,   score: 1.00 },
  { maxDays: 30,  score: 0.80 },
  { maxDays: 90,  score: 0.55 },
  { maxDays: 180, score: 0.30 },
  { maxDays: 365, score: 0.15 },
];

// ---- Evidence Level Detection + Score ----

const EVIDENCE_KEYWORDS: Array<{ pattern: RegExp; level: EvidenceLevel }> = [
  { pattern: /\bmeta.analysis\b|\bmeta-analysis\b|\bsystematic review\b/i, level: 'meta_analysis' },
  { pattern: /\bRCT\b|\brandomi[sz]ed\b|\bcontrolled trial\b/i,               level: 'rct' },
  { pattern: /\bcohort\b|\bprospective\b|\bretrospective\b|\blongitudinal\b/i, level: 'cohort_study' },
  { pattern: /\bcase[- ]control\b/i,                                             level: 'case_control' },
  { pattern: /\bcase report\b|\bcase series\b/i,                                level: 'case_report' },
  { pattern: /\bexpert opinion\b|\beditorial\b|\bcommentary\b/i,                level: 'expert_opinion' },
];

const EVIDENCE_LEVEL_SCORES: Record<EvidenceLevel, number> = {
  meta_analysis:       1.00,
  systematic_review:   0.95,
  rct:                 0.85,
  cohort_study:        0.65,
  case_control:        0.45,
  case_report:         0.30,
  expert_opinion:      0.20,
  unknown:             0.10,
};

export function deriveEvidenceLevel(text: string): EvidenceLevel {
  // Search in title + snippet
  for (const { pattern, level } of EVIDENCE_KEYWORDS) {
    if (pattern.test(text)) return level;
  }
  return 'unknown';
}

// ---- Data Completeness Score ----

const COMPLETENESS_IDENTIFIERS = [
  { key: 'doi',  weight: 0.40 },
  { key: 'pmid', weight: 0.35 },
  { key: 'nct',  weight: 0.25 },
];

// ---- Engine Implementation ----

export function createCredibilityEngine(): CredibilityEngine {
  function computeBreakdown(
    item: SearchResult,
    ctx?: ScoringContext
  ): { breakdown: CredibilityBreakdown; tier: SourceTier; evidenceLevel: EvidenceLevel } {
    const tier = deriveSourceTier(item, ctx?.tierOverrides);

    // 1. Source authority
    const sourceAuthority = SOURCE_TIER_SCORES[tier];

    // 2. Timeliness
    let timeliness = 0;
    if (item.publishedAt) {
      const ageDays = ((ctx?.now || new Date()).getTime() - new Date(item.publishedAt).getTime()) / DAY_MS;
      for (const band of TIMELINESS_BANDS) {
        if (ageDays <= band.maxDays) {
          timeliness = band.score;
          break;
        }
      }
    }

    // 3. Evidence level
    const searchText = `${item.title || ''} ${item.snippet || ''}`.slice(0, 1000);
    const evidenceLevel = deriveEvidenceLevel(searchText);

    // 4. Data completeness
    let dataCompleteness = 0;
    for (const { key, weight } of COMPLETENESS_IDENTIFIERS) {
      if ((item as any)[key]) {
        dataCompleteness += weight;
      }
    }

    return {
      breakdown: { sourceAuthority, timeliness, evidenceLevel: EVIDENCE_LEVEL_SCORES[evidenceLevel], dataCompleteness },
      tier,
      evidenceLevel,
    };
  }

  return {
    scoreOne(item: SearchResult, ctx?: ScoringContext): ScoredResult {
      const weights = ctx?.weights || DEFAULT_WEIGHTS;
      const { breakdown, tier, evidenceLevel } = computeBreakdown(item, ctx);

      const composite =
        weights.sourceAuthority * breakdown.sourceAuthority +
        weights.timeliness * breakdown.timeliness +
        weights.evidenceLevel * breakdown.evidenceLevel +
        weights.dataCompleteness * breakdown.dataCompleteness;

      const score = Math.round(composite * 100);

      return {
        ...item,
        credibility: {
          score,
          breakdown,
          sourceTier: tier,
          evidenceLevel,
          scoredAt: new Date().toISOString(),
        },
      };
    },

    scoreAll(items: SearchResult[], ctx?: ScoringContext): ScoredResult[] {
      return items.map((item) => this.scoreOne(item, ctx));
    },

    rescore(items: ScoredResult[], ctx?: ScoringContext): ScoredResult[] {
      return items.map((item) => {
        const { credibility: _, ...base } = item;
        return this.scoreOne(base as SearchResult, ctx);
      });
    },
  };
}
