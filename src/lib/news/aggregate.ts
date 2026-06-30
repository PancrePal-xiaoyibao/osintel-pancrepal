/**
 * @deprecated Superseded by src/lib/search/ module. This file is kept for
 * reference only and will be removed in a future cleanup pass. The news
 * pipeline now calls searchAggregate() from the unified search module.
 */

/**
 * Multi-source news aggregator.
 *
 * The homepage news feed is NOT a demo: it fans out to several real search
 * capabilities in parallel and merges them into the normalized news pipeline:
 *
 *   - KnowS evidence search (papers / guidelines / trials)  [api.nullht.com]
 *   - Europe PMC / PubMed literature                        [ebi.ac.uk]
 *   - ClinicalTrials.gov v2 registry                        [clinicaltrials.gov]
 *   - AnySearch web/news search                             [api.anysearch.com]
 *
 * Each adapter is wrapped so one failing source never blocks the others. Every
 * result carries its real source URL, so the feed stays citation-resolvable
 * (no fabricated content). Additional adapters (LLM-grounded search, MCP search)
 * can be added by pushing another entry into `runSources` below.
 */

import {
  normalizeKnowsEvidencePayload,
  type NewsNormalizedItem,
  type NewsWindowLabel
} from './pipeline.ts';
import { knowsMultiSearch, type KnowsSource } from '../knows/knows-client.ts';
import { normalizeEvidences } from '../knows/normalize.ts';
import { searchPapers } from '../research/europepmc-adapter.ts';
import { searchTrials } from '../research/ctgov-adapter.ts';
import { anySearch } from '../search/anysearch-adapter.ts';

export type AggregateSourceStatus = {
  source: string;
  ok: boolean;
  count: number;
  reason?: string;
};

export type AggregateOptions = {
  query: string;
  observedAt: string;
  knowsApiKey?: string;
  knowsBaseUrl?: string;
  anySearchApiKey?: string;
  anySearchEndpoint?: string;
  enableAnySearch?: boolean;
};

export type AggregateOutput = {
  normalized: NewsNormalizedItem[];
  sources: AggregateSourceStatus[];
};

// Loose shape matching the pipeline's internal KnowsEvidence contract.
type EvidenceLike = {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
  topicTags?: string[];
  contentTags?: string[];
  summary?: string;
  patientSummary?: string;
  centerPriority?: boolean;
  sourceEvidence?: Array<{ title: string; url: string; note?: string }>;
};

function normalizeBatch(
  results: EvidenceLike[],
  sourceKey: string,
  windowLabel: NewsWindowLabel,
  observedAt: string,
  query: string
): NewsNormalizedItem[] {
  if (!results.length) return [];
  return normalizeKnowsEvidencePayload(
    { query, results: results as any },
    { sourceKey, windowLabel, observedAt }
  );
}

/** Europe PMC (PubMed) -> evidence list. */
async function fromPubMed(query: string): Promise<{ status: AggregateSourceStatus; items: EvidenceLike[] }> {
  const result = await searchPapers({ query, limit: 12 });
  if (!result.ok) {
    return { status: { source: 'pubmed', ok: false, count: 0, reason: result.reason }, items: [] };
  }
  const items: EvidenceLike[] = result.items.map((p) => ({
    title: p.title,
    url: p.url,
    source: p.journal || 'PubMed',
    publishedAt: p.year ? `${p.year}-01-01T00:00:00.000Z` : undefined,
    evidenceLevel: 'B',
    topicTags: ['paper', 'pubmed'],
    contentTags: ['literature'],
    summary: p.abstract,
    patientSummary: p.abstract,
    sourceEvidence: [{ title: p.title, url: p.url }]
  }));
  return { status: { source: 'pubmed', ok: true, count: items.length }, items };
}

/** ClinicalTrials.gov v2 -> evidence list. */
async function fromTrials(query: string): Promise<{ status: AggregateSourceStatus; items: EvidenceLike[] }> {
  const result = await searchTrials({ term: query, limit: 8 });
  if (!result.ok) {
    return { status: { source: 'clinicaltrials', ok: false, count: 0, reason: result.reason }, items: [] };
  }
  const items: EvidenceLike[] = result.items.map((t) => ({
    title: t.title,
    url: t.url,
    source: t.sponsor || 'ClinicalTrials.gov',
    evidenceLevel: 'B',
    topicTags: ['trial', 'clinicaltrials'],
    contentTags: ['registry', (t.status || '').toLowerCase()].filter(Boolean),
    summary: `${t.status || ''} ${(t.phase || []).join('/')} — ${(t.conditions || []).join(', ')}`.trim(),
    patientSummary: `Recruiting/registry trial: ${(t.conditions || []).join(', ')}`.trim(),
    // NCT id in the evidence title so downstream can surface clinicalTrialId.
    sourceEvidence: [{ title: t.nct, url: t.url }]
  }));
  return { status: { source: 'clinicaltrials', ok: true, count: items.length }, items };
}

/** KnowS multi-source (papers / guidelines / trials) -> evidence list. */
async function fromKnows(
  query: string,
  apiKey?: string,
  baseUrl?: string
): Promise<{ status: AggregateSourceStatus; items: EvidenceLike[] }> {
  const sources: KnowsSource[] = ['paper_en', 'guide', 'trial'];
  try {
    const results = await knowsMultiSearch({ sources, query, apiKey, baseUrl });
    const anyOk = results.some((r) => r.ok);
    const items: EvidenceLike[] = [];
    for (const r of results) {
      if (!r.ok || !r.evidences.length) continue;
      const normalized = normalizeEvidences(r.evidences, r.source);
      const level: 'A' | 'B' | 'C' = r.source === 'guide' ? 'A' : r.source === 'trial' ? 'B' : 'C';
      const topic = r.source === 'guide' ? ['guideline'] : r.source === 'trial' ? ['trial'] : ['paper'];
      for (const ev of normalized) {
        const url = ev.url || (ev.doi ? `https://doi.org/${ev.doi}` : '');
        if (!url) continue;
        items.push({
          title: ev.title,
          url,
          source: ev.journal || 'KnowS',
          publishedAt: ev.publishDate,
          evidenceLevel: level,
          topicTags: ev.studyType ? [...topic, ev.studyType] : topic,
          contentTags: r.source === 'guide' ? ['guideline'] : r.source === 'trial' ? ['registry'] : ['literature'],
          summary: ev.abstract,
          patientSummary: ev.abstract,
          sourceEvidence: [{ title: ev.title, url }]
        });
      }
    }
    return {
      status: { source: 'knows', ok: anyOk, count: items.length, reason: anyOk ? undefined : 'no_evidence' },
      items
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'request_failed';
    return { status: { source: 'knows', ok: false, count: 0, reason }, items: [] };
  }
}

/** AnySearch web/news -> evidence list. */
async function fromAnySearch(
  query: string,
  apiKey?: string,
  endpoint?: string
): Promise<{ status: AggregateSourceStatus; items: EvidenceLike[] }> {
  const result = await anySearch({
    query: `${query} latest news`,
    maxResults: 10,
    freshness: 'week',
    contentTypes: ['news', 'web'],
    apiKey,
    endpoint
  });
  if (!result.ok) {
    return { status: { source: 'anysearch', ok: false, count: 0, reason: result.reason }, items: [] };
  }
  const items: EvidenceLike[] = result.items.map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source || 'Web',
    publishedAt: r.publishedAt,
    evidenceLevel: 'C',
    topicTags: ['web', 'news'],
    contentTags: ['news'],
    summary: r.snippet,
    patientSummary: r.snippet,
    sourceEvidence: [{ title: r.title, url: r.url }]
  }));
  return { status: { source: 'anysearch', ok: true, count: items.length }, items };
}

/**
 * Fan out to all configured search capabilities in parallel and return the
 * merged normalized items plus a per-source status report.
 */
export async function gatherNewsEvidence(options: AggregateOptions): Promise<AggregateOutput> {
  const { query, observedAt } = options;

  const tasks: Array<{ key: string; window: NewsWindowLabel; run: () => Promise<{ status: AggregateSourceStatus; items: EvidenceLike[] }> }> = [
    { key: 'knows', window: '7d', run: () => fromKnows(query, options.knowsApiKey, options.knowsBaseUrl) },
    { key: 'pubmed', window: '30d', run: () => fromPubMed(query) },
    { key: 'clinicaltrials', window: '7d', run: () => fromTrials(query) }
  ];
  if (options.enableAnySearch !== false) {
    tasks.push({ key: 'anysearch', window: '24h', run: () => fromAnySearch(query, options.anySearchApiKey, options.anySearchEndpoint) });
  }

  const settled = await Promise.allSettled(tasks.map((t) => t.run()));

  const normalized: NewsNormalizedItem[] = [];
  const sources: AggregateSourceStatus[] = [];

  settled.forEach((outcome, index) => {
    const task = tasks[index];
    if (outcome.status === 'fulfilled') {
      const { status, items } = outcome.value;
      sources.push(status);
      normalized.push(...normalizeBatch(items, task.key, task.window, observedAt, query));
    } else {
      sources.push({ source: task.key, ok: false, count: 0, reason: 'rejected' });
    }
  });

  return { normalized, sources };
}
