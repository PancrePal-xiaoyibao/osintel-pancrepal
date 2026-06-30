import type { SearchProvider, SearchResult, SearchOptions } from '../types';
import { registerProvider } from '../registry';
import { anySearch } from '../anysearch-adapter';

const anysearchProvider: SearchProvider = {
  id: 'anysearch',
  kind: 'web',

  isConfigured(): boolean {
    return true; // anonymous access
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const result = await anySearch({
        query,
        maxResults: options.maxResults ?? 10,
        freshness: options.freshness ?? 'week',
        contentTypes: ['news', 'web'],
        apiKey: process.env.ANYSEARCH_API_KEY,
      });
      if (!result.ok) return [];

      return result.items.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet,
        source: item.source || 'web',
        providerId: 'anysearch',
        kind: 'web' as const,
        publishedAt: item.publishedAt,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(anysearchProvider);

export default anysearchProvider;
