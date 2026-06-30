import type { SearchProvider, SearchResult, SearchOptions } from '../types';
import { registerProvider } from '../registry';
import { searchPapers } from '../../research/europepmc-adapter';

const pubmedProvider: SearchProvider = {
  id: 'pubmed',
  kind: 'academic',

  isConfigured(): boolean {
    return true; // no key needed
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const result = await searchPapers({ query, limit: options.maxResults ?? 10 });
      if (!result.ok) return [];

      return result.items.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.abstract,
        source: item.journal || 'PubMed',
        providerId: 'pubmed',
        kind: 'academic' as const,
        publishedAt: item.year,
        doi: item.doi,
        pmid: item.pmid,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(pubmedProvider);

export default pubmedProvider;
