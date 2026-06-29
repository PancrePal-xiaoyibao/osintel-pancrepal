import type { NewsWindowLabel } from './pipeline.ts';
import { normalizeKnowsEvidencePayload } from './pipeline.ts';
import { knowsSearch } from '../knows/knows-client.ts';
import { normalizeEvidences } from '../knows/normalize.ts';

export type KnowsAdapterInput = {
  query: string;
  apiKey?: string;
  baseUrl: string;
  windowLabel: NewsWindowLabel;
  observedAt?: string;
};

/**
 * News-pipeline adapter for KnowS English-paper evidence.
 *
 * Rebased onto the shared KnowS client so it reads the real `{ evidences }`
 * response shape and works on the anonymous tier when no API key is set. The
 * normalized evidences are mapped into the news pipeline's KnowsEvidence shape.
 */
export async function fetchKnowsEvidence(input: KnowsAdapterInput) {
  const result = await knowsSearch({
    source: 'paper_en',
    query: input.query,
    apiKey: input.apiKey,
    baseUrl: input.baseUrl
  });

  if (!result.ok) {
    return { ok: false as const, reason: result.reason || 'request_failed', items: [] };
  }

  const observedAt = input.observedAt || new Date().toISOString();
  const normalizedEvidences = normalizeEvidences(result.evidences, 'paper_en');

  // Map shared-client evidence into the news pipeline's KnowsEvidence contract.
  const mapped = normalizedEvidences.map((ev) => ({
    title: ev.title,
    url: ev.url || (ev.doi ? `https://doi.org/${ev.doi}` : ''),
    source: ev.journal || 'KnowS',
    publishedAt: ev.publishDate,
    evidenceLevel: 'C' as const,
    topicTags: ev.studyType ? [ev.studyType] : [],
    contentTags: [] as string[],
    summary: ev.abstract,
    patientSummary: ev.abstract,
    sourceEvidence: ev.url ? [{ title: ev.title, url: ev.url }] : []
  }));

  const normalized = normalizeKnowsEvidencePayload(
    { query: input.query, results: mapped as any },
    { sourceKey: 'knows', windowLabel: input.windowLabel, observedAt }
  );

  return { ok: true as const, items: normalized };
}
