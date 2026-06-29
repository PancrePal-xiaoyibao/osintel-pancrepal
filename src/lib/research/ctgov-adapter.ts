import type { ClinicalTrialItem } from '../../types';

/**
 * ClinicalTrials.gov v2 search adapter.
 *
 * Mirrors the lifescience-research-copilot skill: query the v2 studies API,
 * default to RECRUITING trials, keep only studies with an NCT id. No API key
 * required.
 */

const CTGOV_STUDIES = 'https://clinicaltrials.gov/api/v2/studies';
const HTTP_TIMEOUT_MS = 25000;

export type CtgovInput = {
  term: string;
  status?: string; // overallStatus filter, default RECRUITING
  limit?: number;
  location?: string; // optional location hint
  baseUrl?: string; // override for proxying / testing
  retries?: number;
};

export type CtgovResult = { ok: boolean; items: ClinicalTrialItem[]; reason?: string };

function buildUrl(input: CtgovInput): string {
  const base = (input.baseUrl || CTGOV_STUDIES).replace(/\/$/, '');
  const params = new URLSearchParams({
    'query.term': input.term,
    'filter.overallStatus': input.status || 'RECRUITING',
    pageSize: String(input.limit ?? 8),
    countTotal: 'true'
  });
  if (input.location) {
    params.set('query.locn', input.location);
  }
  return `${base}?${params.toString()}`;
}

function mapStudy(s: any): ClinicalTrialItem | null {
  const p = s?.protocolSection || {};
  const nct = p?.identificationModule?.nctId;
  if (!nct) return null;

  const locations = Array.isArray(p?.contactsLocationsModule?.locations)
    ? p.contactsLocationsModule.locations
        .map((loc: any) =>
          [loc?.facility, loc?.city, loc?.country].filter(Boolean).join(', ')
        )
        .filter(Boolean)
    : undefined;

  const conditions = Array.isArray(p?.conditionsModule?.conditions)
    ? p.conditionsModule.conditions
    : undefined;

  return {
    nct: String(nct),
    title: p?.identificationModule?.briefTitle || '',
    status: p?.statusModule?.overallStatus || '',
    phase: Array.isArray(p?.designModule?.phases) ? p.designModule.phases : [],
    sponsor: p?.sponsorCollaboratorsModule?.leadSponsor?.name || undefined,
    url: `https://clinicaltrials.gov/study/${nct}`,
    conditions,
    locations: locations && locations.length ? locations.slice(0, 5) : undefined
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

export async function searchTrials(input: CtgovInput): Promise<CtgovResult> {
  const term = (input.term || '').trim();
  if (!term) {
    return { ok: false, reason: 'empty_term', items: [] };
  }

  try {
    const data = await fetchJsonWithRetry(buildUrl(input), input.retries ?? 3);
    const studies = Array.isArray(data?.studies) ? data.studies : [];
    const items = studies
      .map(mapStudy)
      .filter((item): item is ClinicalTrialItem => item !== null);
    return { ok: true, items };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'request_failed';
    return { ok: false, reason, items: [] };
  }
}
