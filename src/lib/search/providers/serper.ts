import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

const serperProvider: SearchProvider = {
  id: 'serper',
  kind: 'web',

  isConfigured(env) {
    return !!env.SERPER_API_KEY;
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: options.maxResults ?? 10,
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as {
        organic?: Array<{ title?: string; link?: string; snippet?: string; source?: string }>;
        news?: Array<{ title?: string; link?: string; snippet?: string; date?: string }>;
      };

      const results: SearchResult[] = [];

      if (Array.isArray(json.organic)) {
        for (const item of json.organic) {
          results.push({
            title: item.title ?? '',
            url: item.link ?? '',
            snippet: item.snippet ?? '',
            source: item.source ?? new URL(item.link ?? 'https://unknown').hostname,
            providerId: 'serper',
            kind: 'web',
          });
        }
      }

      if (Array.isArray(json.news)) {
        for (const item of json.news) {
          results.push({
            title: item.title ?? '',
            url: item.link ?? '',
            snippet: item.snippet ?? '',
            source: new URL(item.link ?? 'https://unknown').hostname,
            providerId: 'serper',
            kind: 'web',
            publishedAt: item.date,
          });
        }
      }

      return results;
    } catch {
      return [];
    }
  },
};

registerProvider(serperProvider);
