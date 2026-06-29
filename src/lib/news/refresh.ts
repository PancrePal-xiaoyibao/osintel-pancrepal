import { fetchKnowsEvidence } from './knows-adapter.ts';
import {
  buildNewsRefreshWindow,
  dedupeNewsItems,
  getFreshnessWindowLabel,
  rankNewsItems,
  type NewsNormalizedItem,
  type NewsWindow,
  type NewsWindowLabel
} from './pipeline.ts';

export type NewsRefreshOptions = {
  query: string;
  observedAt?: string;
  knowsApiKey?: string;
  knowsBaseUrl?: string;
  sourceKey?: string;
  freshnessWindows?: NewsWindowLabel[];
};

export type NewsRefreshResult = {
  items: NewsNormalizedItem[];
  windows: NewsWindow[];
  mode: 'knows' | 'fallback';
  refreshedAt: string;
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

export async function refreshNewsWindows(options: NewsRefreshOptions): Promise<NewsRefreshResult> {
  const observedAt = options.observedAt || new Date().toISOString();
  const freshnessWindows = options.freshnessWindows || ['24h', '7d', '30d'];
  const query = options.query.trim() || 'pancreatic cancer';

  const knowsResult = await fetchKnowsEvidence({
    query,
    apiKey: options.knowsApiKey,
    baseUrl: options.knowsBaseUrl || 'https://api.nullht.com',
    windowLabel: '24h',
    observedAt
  });

  const items = knowsResult.ok && knowsResult.items.length > 0 ? knowsResult.items : buildFallbackItems(query, observedAt);
  const ranked = rankNewsItems(dedupeNewsItems(items));
  const windows = buildNewsRefreshWindow({ items: ranked, freshnessWindows }).windows;

  return {
    items: ranked,
    windows,
    mode: knowsResult.ok ? 'knows' : 'fallback',
    refreshedAt: observedAt
  };
}

