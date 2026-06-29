import type { KnowsRawEvidence, KnowsSource } from './knows-client.ts';

/**
 * Normalize heterogeneous KnowS evidence objects into one display shape while
 * preserving the raw object for callers that need source-specific fields.
 */
export type NormalizedEvidence = {
  id: string;
  source: KnowsSource;
  title: string;
  abstract: string;
  url: string;
  journal?: string;
  publishDate?: string;
  authors?: string[];
  doi?: string;
  studyType?: string;
  hasPdf?: boolean;
  raw: KnowsRawEvidence;
};

function str(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] != null && obj[key] !== '') return obj[key];
  }
  return undefined;
}

function toAuthors(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const list = value
      .map((a) => (typeof a === 'string' ? a : str((a as any)?.name)))
      .filter(Boolean);
    return list.length ? list : undefined;
  }
  if (typeof value === 'string') {
    const list = value.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    return list.length ? list : undefined;
  }
  return undefined;
}

function deriveUrl(obj: Record<string, unknown>, doi?: string): string {
  const direct = str(pick(obj, ['url', 'link', 'source_url', 'detail_url', 'web_url']));
  if (direct) return direct;
  const pmid = str(pick(obj, ['pmid', 'pubmed_id']));
  if (pmid) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  const nct = str(pick(obj, ['nct_id', 'nct', 'trial_id']));
  if (/^NCT/i.test(nct)) return `https://clinicaltrials.gov/study/${nct}`;
  if (doi) return `https://doi.org/${doi}`;
  return '';
}

export function normalizeEvidence(raw: KnowsRawEvidence, source: KnowsSource, index = 0): NormalizedEvidence {
  const obj = raw as Record<string, unknown>;
  const metadata = (obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : {}) as Record<string, unknown>;
  const merged = { ...metadata, ...obj };

  const doi = str(pick(merged, ['doi'])) || undefined;
  const id =
    str(pick(merged, ['id', 'evidence_id', 'pmid', 'nct_id', 'doi'])) || `${source}-${index}`;

  return {
    id,
    source,
    title: str(pick(merged, ['title', 'name', 'headline'])) || '(无标题)',
    abstract: str(pick(merged, ['abstract', 'summary', 'snippet', 'content', 'description'])),
    url: deriveUrl(merged, doi),
    journal: str(pick(merged, ['journal', 'journal_title', 'source', 'publisher'])) || undefined,
    publishDate: str(pick(merged, ['publish_date', 'published_at', 'pub_date', 'date', 'year'])) || undefined,
    authors: toAuthors(pick(merged, ['authors', 'author'])),
    doi,
    studyType: str(pick(merged, ['study_type', 'type', 'evidence_type'])) || undefined,
    hasPdf: typeof merged.has_pdf === 'boolean' ? (merged.has_pdf as boolean) : undefined,
    raw
  };
}

export function normalizeEvidences(evidences: KnowsRawEvidence[], source: KnowsSource): NormalizedEvidence[] {
  return evidences.map((ev, i) => normalizeEvidence(ev, source, i));
}
