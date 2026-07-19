import type { SearchResult, SearchKind } from '../search/types';

// ---- Source Authority ----

/**
 * Source authority tiers.
 * Determines the base credibility contribution from the source itself.
 */
export type SourceTier =
  | 's1_regulatory'    // e.g. FDA, WHO, NMPA
  | 's2_top_journal'   // e.g. NEJM, Lancet, JAMA, Nature
  | 's3_clinical_trial' // e.g. ClinicalTrials.gov, ChiCTR
  | 's4_academic'      // e.g. PubMed, Europe PMC, Semantic Scholar
  | 's5_guideline'     // e.g. NCI, NCCN guidelines
  | 's6_medical_news'  // e.g. Medical News Today, Medscape
  | 's7_general_news'  // e.g. general web search
  | 's8_unknown';      // fallback

/** Map of source name patterns → SourceTier */
export type SourceTierMap = Record<string, SourceTier>;

// ---- Evidence Level ----

/**
 * Evidence hierarchy levels.
 * Higher levels = stronger evidence.
 */
export type EvidenceLevel =
  | 'meta_analysis'
  | 'systematic_review'
  | 'rct'                // randomized controlled trial
  | 'cohort_study'
  | 'case_control'
  | 'case_report'
  | 'expert_opinion'
  | 'unknown';

// ---- Score Breakdown ----

/** Individual dimension score (always 0–1) */
export type DimensionScore = number;

/** Detailed credibility score breakdown */
export type CredibilityBreakdown = {
  /** Source authority score (0–1) */
  sourceAuthority: DimensionScore;
  /** Timeliness score (0–1) */
  timeliness: DimensionScore;
  /** Evidence level score (0–1) */
  evidenceLevel: DimensionScore;
  /** Data completeness score (0–1) */
  dataCompleteness: DimensionScore;
};

// ---- Weight Configuration ----

/**
 * Per-dimension weight.
 * Must sum to 1.0 across all four dimensions.
 */
export type CredibilityWeights = {
  sourceAuthority: number;   // default 0.40
  timeliness: number;        // default 0.20
  evidenceLevel: number;     // default 0.25
  dataCompleteness: number;  // default 0.15
};

// ---- Composite Output ----

/**
 * Final credibility assessment attached to a result item.
 */
export type CredibilityScore = {
  /** Composite score 0-100 */
  score: number;
  /** Dimension-by-dimension breakdown */
  breakdown: CredibilityBreakdown;
  /** Detected source tier */
  sourceTier: SourceTier;
  /** Detected evidence level */
  evidenceLevel: EvidenceLevel;
  /** Timestamp when this score was computed */
  scoredAt: string;
};

/**
 * SearchResult extended with credibility score.
 * Used as the enriched output type.
 */
export type ScoredResult = SearchResult & {
  credibility: CredibilityScore;
};

// ---- Engine Interface ----

/**
 * Context passed to the credibility engine for scoring.
 */
export type ScoringContext = {
  /** Current timestamp (for timeliness calculation) */
  now?: Date;
  /** Custom source tier overrides */
  tierOverrides?: SourceTierMap;
  /** Custom weights */
  weights?: CredibilityWeights;
};

/**
 * Credibility scoring engine.
 */
export interface CredibilityEngine {
  /** Score a single item */
  scoreOne(item: SearchResult, ctx?: ScoringContext): ScoredResult;

  /** Batch score many items */
  scoreAll(items: SearchResult[], ctx?: ScoringContext): ScoredResult[];

  /** Re-score previously scored items (e.g. after config change) */
  rescore(items: ScoredResult[], ctx?: ScoringContext): ScoredResult[];
}
