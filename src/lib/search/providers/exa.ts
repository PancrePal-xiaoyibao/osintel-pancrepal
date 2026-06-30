import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

const exaProvider: SearchProvider = {
  id: 'exa',
  kind: 'academic',

  isConfigured(env) {
    return !!env.EXA_API_KEY;
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.EXA_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          numResults: options.maxResults ?? 10,
          useAutoprompt: true,
          type: 'neural',
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as {
        results?: Array<{
          title?: string;
          url?: string;
          text?: string;
          publishedDate?: string;
          author?: string;
        }>;
      };

      if (!json.results || !Array.isArray(json.results)) return [];

      return json.results.map((item) => ({
        title: item.title ?? '',
        url: item.url ?? '',
        snippet: item.text ?? '',
        source: new URL(item.url ?? 'https://unknown').hostname,
        providerId: 'exa',
        kind: 'academic' as const,
        publishedAt: item.publishedDate,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(exaProvider);
