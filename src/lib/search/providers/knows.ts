import type { SearchProvider, SearchResult, SearchOptions } from '../types';
import { registerProvider } from '../registry';
import { knowsMultiSearch } from '../../knows/knows-client';
import { normalizeEvidences } from '../../knows/normalize';
import type { KnowsSource } from '../../knows/knows-client';

const knowsProvider: SearchProvider = {
  id: 'knows',
  kind: 'academic',

  isConfigured(): boolean {
    return true; // anonymous tier works
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const sources: KnowsSource[] = ['paper_en', 'guide', 'trial'];
      const results = await knowsMultiSearch({
        sources,
        query,
        apiKey: process.env.KNOWS_API_KEY,
        baseUrl: process.env.KNOWS_BASE_URL,
      });

      const searchResults: SearchResult[] = [];
      for (const result of results) {
        if (!result.ok) continue;
        const normalized = normalizeEvidences(result.evidences, result.source);
        for (const ev of normalized) {
          searchResults.push({
            title: ev.title,
            url: ev.url || (ev.doi ? `https://doi.org/${ev.doi}` : ''),
            snippet: ev.abstract,
            source: ev.journal || 'KnowS',
            providerId: 'knows',
            kind: 'academic',
            publishedAt: ev.publishDate,
            doi: ev.doi,
            pmid: /^\d+$/.test(ev.id) ? ev.id : undefined,
          });
        }
      }

      return searchResults.slice(0, options.maxResults ?? 30);
    } catch {
      return [];
    }
  },
};

registerProvider(knowsProvider);

export default knowsProvider;
