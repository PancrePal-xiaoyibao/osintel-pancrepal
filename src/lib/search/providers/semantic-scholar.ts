import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

const semanticScholarProvider: SearchProvider = {
  id: 'semantic_scholar',
  kind: 'academic',

  isConfigured(_env) {
    return true; // no key needed, public API
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${options.maxResults ?? 10}&fields=title,url,abstract,year,externalIds`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as {
        data?: Array<{
          paperId?: string;
          title?: string;
          url?: string;
          abstract?: string;
          year?: number;
          externalIds?: { DOI?: string; PubMed?: string };
        }>;
      };

      if (!json.data || !Array.isArray(json.data)) return [];

      return json.data.map((item) => ({
        title: item.title ?? '',
        url: item.url ?? `https://www.semanticscholar.org/paper/${item.paperId ?? ''}`,
        snippet: item.abstract ?? '',
        source: 'Semantic Scholar',
        providerId: 'semantic_scholar',
        kind: 'academic' as const,
        publishedAt: item.year ? `${item.year}-01-01` : undefined,
        doi: item.externalIds?.DOI,
        pmid: item.externalIds?.PubMed,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(semanticScholarProvider);
