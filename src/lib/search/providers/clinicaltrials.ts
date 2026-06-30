import type { SearchProvider, SearchResult, SearchOptions } from '../types';
import { registerProvider } from '../registry';
import { searchTrials } from '../../research/ctgov-adapter';

const clinicaltrialsProvider: SearchProvider = {
  id: 'clinicaltrials',
  kind: 'trial',

  isConfigured(): boolean {
    return true; // no key needed
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const result = await searchTrials({ term: query, limit: options.maxResults ?? 8 });
      if (!result.ok) return [];

      return result.items.map((item) => {
        const snippetParts = [item.status, item.phase.join('/'), ...(item.conditions || [])].filter(Boolean);
        return {
          title: item.title,
          url: item.url,
          snippet: snippetParts.join(' · '),
          source: item.sponsor || 'ClinicalTrials.gov',
          providerId: 'clinicaltrials',
          kind: 'trial' as const,
          nct: item.nct,
        };
      });
    } catch {
      return [];
    }
  },
};

registerProvider(clinicaltrialsProvider);

export default clinicaltrialsProvider;
