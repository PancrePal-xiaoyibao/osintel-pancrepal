import {
  buildNewsRefreshWindow,
  dedupeNewsItems,
  getFreshnessWindowLabel,
  normalizeKnowsEvidencePayload,
  rankNewsItems,
  type NewsNormalizedItem,
  type NewsWindow,
  type NewsWindowLabel
} from './pipeline.ts';
// Side-effect import: registers all 12 search providers in the registry.
import '../search/providers/index';
import { searchAggregate } from '../search/index';
import type { AggregateResult, SearchResult } from '../search/types';

export type NewsRefreshOptions = {
  query: string;
  observedAt?: string;
  freshnessWindows?: NewsWindowLabel[];
  /** @deprecated Providers now read process.env directly. Kept for compat. */
  knowsApiKey?: string;
  /** @deprecated Providers now read process.env directly. Kept for compat. */
  knowsBaseUrl?: string;
  /** @deprecated Providers now read process.env directly. Kept for compat. */
  anySearchApiKey?: string;
  /** @deprecated Providers now read process.env directly. Kept for compat. */
  anySearchEndpoint?: string;
  /** @deprecated Providers now read process.env directly. Kept for compat. */
  enableAnySearch?: boolean;
  /** @deprecated Not used by the unified search module. */
  sourceKey?: string;
  /** Optional callback to stream pipeline log lines (for live UI console). */
  onLog?: (line: string) => void;
  /** When false, return an empty fallback result instead of synthetic demo items. */
  allowSyntheticFallback?: boolean;
};

export type NewsRefreshResult = {
  items: NewsNormalizedItem[];
  windows: NewsWindow[];
  mode: 'aggregate' | 'fallback';
  refreshedAt: string;
  sources: Array<{ source: string; ok: boolean; count: number; reason?: string }>;
};

function buildFallbackItems(query: string, observedAt: string): NewsNormalizedItem[] {
  const windows: Array<{ label: NewsWindowLabel; minutesAgo: number }> = [
    { label: '24h', minutesAgo: 40 },
    { label: '24h', minutesAgo: 120 },
    { label: '7d', minutesAgo: 3 * 24 * 60 },
    { label: '7d', minutesAgo: 5 * 24 * 60 },
    { label: '30d', minutesAgo: 15 * 24 * 60 },
    { label: '30d', minutesAgo: 20 * 24 * 60 }
  ];

  const centerItems = [
    {
      title: 'Major pancreatic center publishes fast-track MDT update',
      source: 'MD Anderson Cancer Center',
      sourceType: 'center' as const,
      topicTags: ['center', 'mdt', 'clinical'],
      contentTags: ['center-first', 'guideline'],
      evidenceLevel: 'A' as const,
      summary: 'Center-first update on imaging, tumor board routing, and clinical intake.',
      patientSummary: 'Major center update with fast-track triage and treatment routing.',
      centerPriority: true,
      treatmentCenterKey: 'md-anderson',
      countryKey: 'usa',
      cityKey: 'houston',
      sourceEvidence: [{ title: 'Center update', url: 'https://example.org/center' }]
    },
    {
      title: 'Pancreatic trial reports KRAS target update',
      source: 'ClinicalTrials.gov',
      sourceType: 'trial' as const,
      topicTags: ['trial', 'kras', 'drug'],
      contentTags: ['data', 'registry'],
      evidenceLevel: 'B' as const,
      summary: 'Early-stage trial update on target engagement and enrollment.',
      patientSummary: 'Clinical trial update focused on target and enrollment status.',
      centerPriority: false,
      treatmentCenterKey: 'clinicaltrials',
      countryKey: 'global',
      cityKey: 'global',
      sourceEvidence: [{ title: 'Trial record', url: 'https://example.org/trial' }]
    },
    {
      title: 'Drug target briefing on KRAS inhibitor pipeline',
      source: 'ASCO GI',
      sourceType: 'drug' as const,
      topicTags: ['drug', 'target'],
      contentTags: ['mechanism', 'pipeline'],
      evidenceLevel: 'B' as const,
      summary: 'Target and mechanism briefing for pancreatic cancer drug development.',
      patientSummary: 'Drug target briefing with target and mechanism signals.',
      centerPriority: false,
      treatmentCenterKey: 'asco',
      countryKey: 'global',
      cityKey: 'global',
      sourceEvidence: [{ title: 'Drug briefing', url: 'https://example.org/drug' }]
    },
    {
      title: 'Psychology and nutrition support note for pancreatic care',
      source: 'Patient support program',
      sourceType: 'psychology' as const,
      topicTags: ['psychology', 'nutrition'],
      contentTags: ['support', 'care'],
      evidenceLevel: 'C' as const,
      summary: 'Supportive care note covering distress, appetite, and weight maintenance.',
      patientSummary: 'Support note for distress management and nutrition.',
      centerPriority: false,
      treatmentCenterKey: 'support',
      countryKey: 'global',
      cityKey: 'global',
      sourceEvidence: [{ title: 'Support note', url: 'https://example.org/support' }]
    }
  ];

  return windows.map((window, index) => {
    const template = centerItems[index % centerItems.length];
    const publishedAt = new Date(Date.parse(observedAt) - window.minutesAgo * 60000).toISOString();
    const freshnessMinutes = window.minutesAgo;
    const item: NewsNormalizedItem = {
      itemKey: `fallback-${index}-${window.label}`,
      sourceKey: 'fallback',
      sourceTitle: template.source,
      sourceUrl: template.sourceEvidence[0].url,
      sourceType: template.sourceType,
      publishedAt,
      observedAt,
      freshnessMinutes,
      windowLabel: getFreshnessWindowLabel(freshnessMinutes),
      title: `${template.title} for ${query}`,
      summary: template.summary,
      patientSummary: template.patientSummary,
      evidenceLevel: template.evidenceLevel,
      topicTags: template.topicTags,
      contentTags: template.contentTags,
      centerPriority: template.centerPriority,
      reviewStatus: template.centerPriority ? 'approved' : 'pending',
      regionKey: 'global',
      countryKey: template.countryKey,
      cityKey: template.cityKey,
      treatmentCenterKey: template.treatmentCenterKey,
      sourceEvidence: template.sourceEvidence,
      dedupeKey: `${template.title.toLowerCase()}|${template.sourceEvidence[0].url.toLowerCase()}`,
      priorityScore: 0,
      riskFlags: []
    };
    item.priorityScore = template.centerPriority ? 92 - index : 60 - index;
    return item;
  });
}

/** Convert SearchResult[] from the unified search module into NewsNormalizedItem[]. */
function mapSearchResultsToNews(
  results: SearchResult[],
  observedAt: string,
  query: string
): NewsNormalizedItem[] {
  // Build EvidenceLike objects from SearchResult and use the existing normalizer
  const evidences = results.map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source,
    publishedAt: r.publishedAt,
    evidenceLevel: (r.kind === 'guideline' ? 'A' : r.kind === 'trial' || r.kind === 'academic' ? 'B' : 'C') as 'A' | 'B' | 'C' | 'D',
    topicTags: [r.kind, r.providerId],
    contentTags: [r.kind === 'news' ? 'news' : r.kind === 'trial' ? 'registry' : 'literature'],
    summary: r.snippet,
    patientSummary: r.snippet,
    sourceEvidence: [{ title: r.title, url: r.url }]
  }));

  return normalizeKnowsEvidencePayload(
    { query, results: evidences as any },
    { sourceKey: 'aggregate', windowLabel: '7d', observedAt }
  );
}

export async function refreshNewsWindows(options: NewsRefreshOptions): Promise<NewsRefreshResult> {
  const observedAt = options.observedAt || new Date().toISOString();
  const freshnessWindows = options.freshnessWindows || ['24h', '7d', '30d'];
  const query = options.query.trim() || 'pancreatic cancer';

  // Use the unified search module to fan out to all registered providers
  const aggregateResult: AggregateResult = await searchAggregate(query, {
    freshness: 'week',
    env: process.env as Record<string, string | undefined>,
    onLog: options.onLog
  });

  // Map ProviderStatus[] to the sources format expected by NewsRefreshResult
  const sources = aggregateResult.providers.map((p) => ({
    source: p.id,
    ok: p.ok,
    count: p.count,
    reason: p.reason
  }));

  // Map SearchResult[] to NewsNormalizedItem[]
  const normalized = mapSearchResultsToNews(aggregateResult.results, observedAt, query);

  const anySourceOk = sources.some((s) => s.ok && s.count > 0);
  // T7/BE-M5/BE-M7: synthetic fallback items are templated medical-sounding content
  // (e.g. "Pancreatic trial reports KRAS target update") that can mislead non-expert readers.
  // Default OFF in production; dev/test can opt in via allowSyntheticFallback:true or
  // NEWS_ALLOW_SYNTHETIC_FALLBACK=1.
  const isProd = process.env.NODE_ENV === 'production';
  const allowSyntheticFallback = options.allowSyntheticFallback === true
    || (options.allowSyntheticFallback === undefined && !isProd)
    || process.env.NEWS_ALLOW_SYNTHETIC_FALLBACK === '1';
  const items = anySourceOk && normalized.length > 0
    ? normalized
    : allowSyntheticFallback
      ? buildFallbackItems(query, observedAt).map((it) => ({
          ...it,
          sourceKey: 'fallback',
          demo: true as const
        } as NewsNormalizedItem & { demo?: boolean }))
      : [];
  const ranked = rankNewsItems(dedupeNewsItems(items));
  const windows = buildNewsRefreshWindow({ items: ranked, freshnessWindows }).windows;

  const winSummary = windows.map((w) => `${w.label}:${w.items.length}`).join(' ');
  const feedLine = `[feed] normalized ${normalized.length} → ranked ${ranked.length} items | windows ${winSummary} | mode=${aggregateResult.mode === 'fallback' ? 'fallback' : 'aggregate'}`;
  console.log(feedLine);
  try { options.onLog?.(feedLine); } catch { /* ignore */ }

  return {
    items: ranked,
    windows,
    mode: aggregateResult.mode === 'fallback' ? 'fallback' : 'aggregate',
    refreshedAt: observedAt,
    sources
  };
}
