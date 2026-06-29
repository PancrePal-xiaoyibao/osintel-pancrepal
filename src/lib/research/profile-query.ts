import type { PatientProfile, ProfileQuery } from '../../types';

/**
 * Derive de-identified research query tokens from a PatientProfile.
 *
 * Only gene/cancer tokens leave the device for external APIs (PubMed,
 * ClinicalTrials.gov). Never forward name/contact/record identifiers.
 */

const FIXED_CANCER = 'pancreatic cancer';

// Strip Chinese descriptor suffixes/prefixes that are not PubMed-searchable so a
// label like "KRAS G12D 抑制剂" normalizes to the gene token "KRAS G12D".
const CN_NOISE = [
  '抑制剂',
  '突变',
  '靶点',
  '靶向',
  '阳性',
  '阴性',
  '高表达',
  '中低表达',
  '低表达',
  '缺失',
  '扩增',
  '野生型'
];

// Map common Chinese-labeled markers to canonical English gene/marker tokens.
const CN_TOKEN_MAP: Record<string, string> = {
  '微卫星不稳定': 'MSI-H',
  '微卫星高度不稳定': 'MSI-H',
  '错配修复缺陷': 'dMMR',
  '错配修复功能缺陷': 'dMMR'
};

function stripParenthetical(token: string): string {
  // Remove "(Wild-type)", "（野生型）", trailing notes in brackets.
  return token.replace(/[（(][^（()]*[)）]/g, ' ');
}

/**
 * Normalize a single raw mutation label into a PubMed-friendly gene token.
 * Returns an empty string when nothing usable remains.
 */
export function normalizeMutationToken(raw: string): string {
  if (!raw) return '';
  let token = stripParenthetical(raw).trim();

  for (const [cn, en] of Object.entries(CN_TOKEN_MAP)) {
    if (token.includes(cn)) return en;
  }

  for (const noise of CN_NOISE) {
    token = token.split(noise).join(' ');
  }

  // Drop any remaining CJK characters; keep gene-like Latin/number/dash tokens.
  token = token.replace(/[\u4e00-\u9fff]/g, ' ');
  token = token.replace(/\s+/g, ' ').trim();

  // Reject leftovers that no longer contain a Latin letter (e.g. pure spaces).
  if (!/[A-Za-z]/.test(token)) return '';
  return token;
}

export function normalizeMutationTokens(mutations: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of mutations || []) {
    const token = normalizeMutationToken(raw);
    const key = token.toUpperCase();
    if (token && !seen.has(key)) {
      seen.add(key);
      out.push(token);
    }
  }
  return out;
}

/**
 * Build the derived research query from a profile.
 * `defaultQuestion` is used when the profile narrative gives no usable question.
 */
export function deriveQuery(
  profile: PatientProfile | null,
  defaultQuestion = '最新靶向与临床治疗进展'
): ProfileQuery {
  const genes = normalizeMutationTokens(profile?.mutations || []);
  const primary = genes[0] || '';
  const question = (profile?.summary || '').trim() || defaultQuestion;

  // News query is broader: cancer + gene tokens, plain text for the pipeline.
  const newsQuery = [FIXED_CANCER, ...genes].join(' ').trim();

  const city = (profile?.city || '').trim() || undefined;

  return {
    gene: primary,
    genes,
    cancer: FIXED_CANCER,
    question,
    newsQuery: newsQuery || FIXED_CANCER,
    city
  };
}

/**
 * Build the search term string for literature/trials.
 * Combines the primary gene token with the cancer type; falls back to cancer
 * only when no gene token is available.
 */
export function buildSearchTerm(query: Pick<ProfileQuery, 'gene' | 'cancer'>): string {
  return [query.gene, query.cancer].filter(Boolean).join(' ').trim() || FIXED_CANCER;
}
