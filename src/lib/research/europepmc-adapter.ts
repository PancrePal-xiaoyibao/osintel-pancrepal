import type { LiteratureItem } from '../../types';

/**
 * Europe PMC (PubMed) search adapter.
 *
 * Mirrors the lifescience-research-copilot skill: query Europe PMC sorted by
 * publication date, keep only results with a PMID (so every citation resolves),
 * and strip HTML from title/abstract. No API key required.
 */

const EPMC_SEARCH = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const HTTP_TIMEOUT_MS = 25000;

export type EuropePmcInput = {
  query: string;
  yearFrom?: number;
  limit?: number;
  baseUrl?: string; // override for proxying / testing
  retries?: number;
};

export type EuropePmcResult = { ok: boolean; items: LiteratureItem[]; reason?: string };

export function stripHtml(value: string): string {
  if (!value) return '';
  let s = value.replace(/<[^>]+>/g, '');
  const entities: Array<[string, string]> = [
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&amp;', '&'],
    ['&quot;', '"'],
    ['&#39;', "'"]
  ];
  for (const [from, to] of entities) {
    s = s.split(from).join(to);
  }
  return s.replace(/\s+/g, ' ').trim();
}

function buildUrl(input: EuropePmcInput): string {
  const base = (input.baseUrl || EPMC_SEARCH).replace(/\/$/, '');
  const yearFrom = input.yearFrom ?? 2023;
  const limit = input.limit ?? 15;
  const q = `${input.query} AND PUB_YEAR:[${yearFrom} TO 3000]`;
  const params = new URLSearchParams({
    query: q,
    format: 'json',
    pageSize: String(limit),
    sort: 'P_PDATE_D desc',
    resultType: 'core'
  });
  return `${base}?${params.toString()}`;
}

function mapResult(r: any): LiteratureItem | null {
  const pmid = r?.pmid;
  if (!pmid) return null; // only keep citation-resolvable records
  const journal =
    r?.journalTitle || r?.bookOrReportDetails?.publisher || undefined;
  return {
    pmid: String(pmid),
    title: stripHtml(r?.title || ''),
    abstract: stripHtml(r?.abstractText || ''),
    journal,
    year: r?.pubYear ? String(r.pubYear) : undefined,
    doi: r?.doi || undefined,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    citedByCount: typeof r?.citedByCount === 'number' ? r.citedByCount : 0,
    isOpenAccess: r?.isOpenAccess === 'Y'
  };
}

async function fetchJsonWithRetry(url: string, retries: number): Promise<any> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'pancreas-osintel/0.1' },
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`http_${response.status}`);
        }
        return await response.json();
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('request_failed');
}

export async function searchPapers(input: EuropePmcInput): Promise<EuropePmcResult> {
  const query = (input.query || '').trim();
  if (!query) {
    return { ok: false, reason: 'empty_query', items: [] };
  }

  try {
    const data = await fetchJsonWithRetry(buildUrl(input), input.retries ?? 3);
    const results = data?.resultList?.result;
    const list = Array.isArray(results) ? results : [];
    const items = list
      .map(mapResult)
      .filter((item): item is LiteratureItem => item !== null);
    return { ok: true, items };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'request_failed';
    return { ok: false, reason, items: [] };
  }
}
