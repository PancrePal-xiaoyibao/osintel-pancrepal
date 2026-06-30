import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

const googleCseProvider: SearchProvider = {
  id: 'google_cse',
  kind: 'web',

  isConfigured(env) {
    return !!(env.GOOGLE_API_KEY && env.GOOGLE_CSE_ID);
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const key = process.env.GOOGLE_API_KEY;
      const cx = process.env.GOOGLE_CSE_ID;
      const num = Math.min(options.maxResults ?? 10, 10);

      const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&num=${num}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as {
        items?: Array<{
          title?: string;
          link?: string;
          snippet?: string;
          displayLink?: string;
        }>;
      };

      if (!json.items || !Array.isArray(json.items)) return [];

      return json.items.map((item) => ({
        title: item.title ?? '',
        url: item.link ?? '',
        snippet: item.snippet ?? '',
        source: item.displayLink ?? new URL(item.link ?? 'https://unknown').hostname,
        providerId: 'google_cse',
        kind: 'web' as const,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(googleCseProvider);
