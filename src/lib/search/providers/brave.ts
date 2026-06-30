import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

const braveProvider: SearchProvider = {
  id: 'brave',
  kind: 'web',

  isConfigured(env) {
    return !!env.BRAVE_API_KEY;
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const freshness =
        options.freshness === 'day'
          ? 'pd'
          : options.freshness === 'week'
            ? 'pw'
            : 'pm';

      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${options.maxResults ?? 10}&freshness=${freshness}`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': process.env.BRAVE_API_KEY!,
        },
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as {
        web?: {
          results?: Array<{
            title?: string;
            url?: string;
            description?: string;
            page_age?: string;
          }>;
        };
      };

      if (!json.web?.results || !Array.isArray(json.web.results)) return [];

      return json.web.results.map((item) => ({
        title: item.title ?? '',
        url: item.url ?? '',
        snippet: item.description ?? '',
        source: new URL(item.url ?? 'https://unknown').hostname,
        providerId: 'brave',
        kind: 'web' as const,
        publishedAt: item.page_age,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(braveProvider);
