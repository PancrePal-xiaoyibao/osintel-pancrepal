export type NewsSourceType = 'center' | 'clinical' | 'drug' | 'trial' | 'psychology' | 'nutrition' | 'policy' | 'other';

export type NewsWindowLabel = '24h' | '7d' | '30d';

export type NewsReviewStatus = 'pending' | 'needs_human_review' | 'approved' | 'rejected';

export type NewsNormalizedItem = {
  itemKey: string;
  sourceKey: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: NewsSourceType;
  publishedAt: string | null;
  observedAt: string;
  freshnessMinutes: number;
  windowLabel: NewsWindowLabel;
  title: string;
  summary: string;
  patientSummary: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  topicTags: string[];
  contentTags: string[];
  centerPriority: boolean;
  reviewStatus: NewsReviewStatus;
  regionKey: string;
  countryKey: string;
  cityKey: string;
  treatmentCenterKey: string;
  sourceEvidence: Array<{ title: string; url: string; note?: string }>;
  dedupeKey: string;
  priorityScore: number;
  riskFlags: string[];
};

export type NewsWindow = {
  label: NewsWindowLabel;
  items: NewsNormalizedItem[];
};

type KnowsEvidence = {
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
  regionKey?: string;
  countryKey?: string;
  cityKey?: string;
  treatmentCenterKey?: string;
  sourceEvidence?: Array<{ title: string; url: string; note?: string }>;
  riskFlags?: string[];
};

function clampPriority(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getSourceType(tags: string[], title: string, source: string): NewsSourceType {
  const text = `${tags.join(' ')} ${title} ${source}`.toLowerCase();
  if (text.includes('center') || text.includes('hospital') || text.includes('md anderson') || text.includes('heidelberg')) return 'center';
  if (text.includes('trial') || text.includes('clinicaltrials') || text.includes('rct')) return 'trial';
  if (text.includes('drug') || text.includes('inhibitor') || text.includes('target')) return 'drug';
  if (text.includes('psych') || text.includes('distress') || text.includes('mental')) return 'psychology';
  if (text.includes('nutrition') || text.includes('pert') || text.includes('enzyme')) return 'nutrition';
  if (text.includes('policy') || text.includes('guideline')) return 'policy';
  if (text.includes('clinical') || text.includes('oncology') || text.includes('surgery')) return 'clinical';
  return 'other';
}

function inferPriorityScore(item: Pick<NewsNormalizedItem, 'centerPriority' | 'topicTags' | 'contentTags' | 'freshnessMinutes' | 'evidenceLevel'>): number {
  let score = 10;
  if (item.centerPriority) score += 35;
  if (item.topicTags.some((tag) => ['trial', 'drug', 'target', 'clinical'].includes(tag.toLowerCase()))) score += 15;
  if (item.contentTags.some((tag) => ['center-first', 'guideline', 'data', 'registry'].includes(tag.toLowerCase()))) score += 10;
  if (item.topicTags.some((tag) => ['psychology', 'nutrition'].includes(tag.toLowerCase()))) score -= 5;
  if (item.freshnessMinutes <= 240) score += 10;
  if (item.freshnessMinutes <= 60) score += 10;
  if (item.evidenceLevel === 'A') score += 10;
  if (item.evidenceLevel === 'B') score += 6;
  if (item.evidenceLevel === 'C') score += 2;
  return clampPriority(score);
}

function dedupeKeyFor(evidence: KnowsEvidence): string {
  return `${evidence.title.trim().toLowerCase()}|${evidence.url.trim().toLowerCase()}`;
}

export function getFreshnessWindowLabel(freshnessMinutes: number): NewsWindowLabel {
  if (freshnessMinutes <= 24 * 60) return '24h';
  if (freshnessMinutes <= 7 * 24 * 60) return '7d';
  return '30d';
}

function normalizeRiskFlags(flags: string[] | undefined, contentTags: string[]): string[] {
  const joined = [...(flags || []), ...contentTags]
    .map((flag) => flag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(joined)];
}

export function dedupeNewsItems(items: NewsNormalizedItem[]): NewsNormalizedItem[] {
  const deduped = new Map<string, NewsNormalizedItem>();

  for (const item of items) {
    const existing = deduped.get(item.dedupeKey);
    if (!existing) {
      deduped.set(item.dedupeKey, item);
      continue;
    }

    if (
      item.priorityScore > existing.priorityScore ||
      (item.priorityScore === existing.priorityScore && item.centerPriority && !existing.centerPriority)
    ) {
      deduped.set(item.dedupeKey, item);
    }
  }

  return [...deduped.values()];
}

export function rankNewsItems(items: NewsNormalizedItem[]): NewsNormalizedItem[] {
  const evidenceOrder: Record<NewsNormalizedItem['evidenceLevel'], number> = { A: 0, B: 1, C: 2, D: 3 };
  return [...items].sort((a, b) => {
    if (a.centerPriority !== b.centerPriority) return a.centerPriority ? -1 : 1;
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (a.freshnessMinutes !== b.freshnessMinutes) return a.freshnessMinutes - b.freshnessMinutes;
    if (a.evidenceLevel !== b.evidenceLevel) return evidenceOrder[a.evidenceLevel] - evidenceOrder[b.evidenceLevel];
    return a.title.localeCompare(b.title);
  });
}

export function normalizeKnowsEvidencePayload(
  payload: { query: string; results: KnowsEvidence[] },
  opts: { sourceKey: string; windowLabel: NewsWindowLabel; observedAt: string }
): NewsNormalizedItem[] {
  return payload.results.map((result, index) => {
    const topicTags = result.topicTags?.length ? result.topicTags : [];
    const contentTags = result.contentTags?.length ? result.contentTags : [];
    const centerPriority = result.centerPriority ?? getSourceType(topicTags, result.title, result.source) === 'center';
    const publishedAt = result.publishedAt ?? null;
    const freshnessMinutes = publishedAt ? Math.max(0, Math.round((Date.parse(opts.observedAt) - Date.parse(publishedAt)) / 60000)) : 0;
    const sourceEvidence = result.sourceEvidence?.length ? result.sourceEvidence : [{ title: result.source, url: result.url }];
    const reviewStatus: NewsReviewStatus = result.riskFlags?.length ? 'needs_human_review' : centerPriority ? 'approved' : 'pending';
    const item: NewsNormalizedItem = {
      itemKey: `${opts.sourceKey}-${index}-${Math.abs(Date.parse(opts.observedAt) + index)}`,
      sourceKey: opts.sourceKey,
      sourceTitle: result.source,
      sourceUrl: result.url,
      sourceType: getSourceType(topicTags, result.title, result.source),
      publishedAt,
      observedAt: opts.observedAt,
      freshnessMinutes,
      windowLabel: opts.windowLabel,
      title: result.title,
      summary: result.summary || '',
      patientSummary: result.patientSummary || result.summary || '',
      evidenceLevel: result.evidenceLevel || 'D',
      topicTags,
      contentTags,
      centerPriority,
      reviewStatus,
      regionKey: result.regionKey || '',
      countryKey: result.countryKey || '',
      cityKey: result.cityKey || '',
      treatmentCenterKey: result.treatmentCenterKey || '',
      sourceEvidence,
      dedupeKey: dedupeKeyFor(result),
      priorityScore: 0,
      riskFlags: normalizeRiskFlags(result.riskFlags, contentTags)
    };

    item.priorityScore = inferPriorityScore(item);
    return item;
  });
}

export function scoreNewsItem(
  item: Pick<NewsNormalizedItem, 'centerPriority' | 'topicTags' | 'contentTags' | 'freshnessMinutes' | 'evidenceLevel'>
): { priorityScore: number; isCenterFirst: boolean } {
  return {
    priorityScore: inferPriorityScore(item),
    isCenterFirst: item.centerPriority
  };
}

export function buildNewsRefreshWindow(input: {
  items: NewsNormalizedItem[];
  freshnessWindows: NewsWindowLabel[];
}): { windows: NewsWindow[] } {
  const windows = input.freshnessWindows.map((label) => {
    const items = input.items.filter((item) => item.windowLabel === label || label === '30d');
    return { label, items: rankNewsItems(dedupeNewsItems(items)) };
  });

  return { windows };
}

export function summarizeNewsWindow(window: NewsWindow): string {
  const top = window.items[0];
  if (!top) return `No news items available for ${window.label}.`;
  return `${window.label}: ${top.title} (${top.sourceType}, score ${top.priorityScore})`;
}
