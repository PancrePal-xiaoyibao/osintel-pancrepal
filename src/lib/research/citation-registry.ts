import type { ClinicalTrialItem, LiteratureItem } from '../../types';

/**
 * Citation registry: the deterministic fact base for zero-hallucination review.
 *
 * The synthesis LLM never touches this map. After synthesis, any citation id not
 * present here is dropped (see hallucination-verify.ts). Paper ids are keyed as
 * `PMID:<id>`; trial ids are keyed by their raw `NCT...` number.
 */

export type RegistryEntry = { url: string; title: string };
export type CitationRegistry = Map<string, RegistryEntry>;

export function buildRegistry(
  papers: LiteratureItem[],
  trials: ClinicalTrialItem[]
): CitationRegistry {
  const registry: CitationRegistry = new Map();
  for (const p of papers) {
    registry.set(`PMID:${p.pmid}`, { url: p.url, title: p.title });
  }
  for (const t of trials) {
    registry.set(t.nct, { url: t.url, title: t.title });
  }
  return registry;
}

/** Normalize a raw citation id from the LLM into the registry key format. */
export function normalizeCitationId(raw: unknown): string {
  return String(raw).trim().replace(/^\[|\]$/g, '').replace(/\s+/g, '');
}
