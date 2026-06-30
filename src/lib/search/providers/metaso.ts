import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

const metasoProvider: SearchProvider = {
  id: 'metaso',
  kind: 'web',

  isConfigured(env) {
    return !!env.METASO_API_KEY;
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const res = await fetch('https://api.metaso.cn/search', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.METASO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: options.maxResults ?? 10,
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as Record<string, unknown>;

      // Parse tolerantly: try data, then results, then top-level array
      let items: Array<{
        title?: string;
        url?: string;
        snippet?: string;
        content?: string;
        source?: string;
      }> = [];

      if (Array.isArray((json as { data?: unknown }).data)) {
        items = (json as { data: typeof items }).data;
      } else if (Array.isArray((json as { results?: unknown }).results)) {
        items = (json as { results: typeof items }).results;
      } else if (Array.isArray(json)) {
        items = json as typeof items;
      }

      return items.map((item) => ({
        title: item.title ?? '',
        url: item.url ?? '',
        snippet: item.snippet ?? item.content ?? '',
        source: item.source ?? new URL(item.url ?? 'https://unknown').hostname,
        providerId: 'metaso',
        kind: 'web' as const,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(metasoProvider);
