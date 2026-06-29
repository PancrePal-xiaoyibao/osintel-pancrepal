import type {
  LiteratureItem,
  PersonalReview,
  ReviewClaim,
  ReviewTheme
} from '../../types';
import { normalizeCitationId, type CitationRegistry } from './citation-registry.ts';

/**
 * Zero-hallucination verification (Layer 1: existence, deterministic hard gate).
 *
 * Ported from the lifescience-research-copilot skill. Any citation id not in the
 * registry is removed; claims with no surviving real citation are dropped. The
 * integrity report drives the trust badge in the UI.
 */

export type RawReview = {
  overview?: string;
  themes: Array<{ name?: string; claims: Array<{ text?: string; citations?: unknown }> }>;
};

function asCitationArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(normalizeCitationId);
  if (value == null) return [];
  return [normalizeCitationId(value)];
}

/**
 * Verify a synthesized review against the registry. Mutates nothing; returns a
 * fully verified PersonalReview with integrity metrics.
 */
export function verifyReview(
  raw: RawReview,
  registry: CitationRegistry,
  engine: 'llm' | 'extractive'
): PersonalReview {
  let valid = 0;
  let invalid = 0;
  let dropped = 0;
  let uncited = 0;

  const themes: ReviewTheme[] = [];

  for (const theme of raw.themes || []) {
    const keptClaims: ReviewClaim[] = [];
    for (const claim of theme.claims || []) {
      const text = (claim.text || '').trim();
      const cites = asCitationArray(claim.citations);
      const good = cites.filter((id) => registry.has(id));
      const bad = cites.filter((id) => !registry.has(id));
      valid += good.length;
      invalid += bad.length;

      if (cites.length === 0) {
        uncited += 1;
        continue;
      }
      if (good.length === 0) {
        dropped += 1;
        continue;
      }
      keptClaims.push({
        text,
        citations: good,
        links: good.map((id) => registry.get(id)!.url)
      });
    }
    if (keptClaims.length > 0) {
      themes.push({ name: theme.name || '未命名主题', claims: keptClaims });
    }
  }

  return {
    overview: raw.overview || '',
    themes,
    engine,
    integrity: {
      citations_valid: valid,
      citations_invalid: invalid,
      claims_dropped: dropped,
      claims_uncited: uncited,
      hallucination_rate: Number((invalid / Math.max(valid + invalid, 1)).toFixed(4)),
      verified: invalid === 0
    }
  };
}

/**
 * Extractive fallback (no LLM): one claim per paper from its abstract's first
 * sentences, cited by its real PMID. Always verification-clean.
 */
export function buildExtractiveReview(papers: LiteratureItem[]): RawReview {
  const claims = papers
    .filter((p) => p.abstract)
    .map((p) => ({
      text: firstSentences(p.abstract, 2),
      citations: [`PMID:${p.pmid}`]
    }));
  return {
    themes: [{ name: '近期关键发现（抽取式兜底，无 LLM）', claims }]
  };
}

export function firstSentences(text: string, n = 2): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.slice(0, n).join(' ').trim();
}

/**
 * Self-test mirroring the skill's `--selftest`: inject a fake PMID and assert the
 * verifier drops it. Returns true on PASS.
 */
export function selftest(): boolean {
  const registry: CitationRegistry = new Map([
    ['PMID:111', { url: 'u1', title: 'real' }]
  ]);
  const raw: RawReview = {
    themes: [
      {
        name: 't',
        claims: [
          { text: '真引用', citations: ['PMID:111'] },
          { text: '假引用应被丢弃', citations: ['PMID:99999999'] },
          { text: '无引用应被丢弃', citations: [] }
        ]
      }
    ]
  };
  const result = verifyReview(raw, registry, 'llm');
  return (
    result.integrity.citations_invalid === 1 &&
    result.integrity.claims_dropped === 1 &&
    result.integrity.claims_uncited === 1 &&
    result.themes.length === 1 &&
    result.themes[0].claims.length === 1 &&
    result.integrity.verified === false
  );
}
