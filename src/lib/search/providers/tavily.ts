import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

const tavilyProvider: SearchProvider = {
  id: 'tavily',
  kind: 'news',

  isConfigured(env) {
    return !!env.TAVILY_API_KEY;
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const freshness = options.freshness ?? 'month';
      const days = freshness === 'day' ? 1 : freshness === 'week' ? 7 : 30;

      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          topic: 'news',
          days,
          max_results: options.maxResults ?? 10,
          include_answer: false,
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as {
        results?: Array<{
          title?: string;
          url?: string;
          content?: string;
          source?: string;
          published_date?: string;
        }>;
      };

      if (!json.results || !Array.isArray(json.results)) return [];

      return json.results.map((r) => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.content ?? '',
        source: r.source ?? new URL(r.url ?? 'https://unknown').hostname,
        providerId: 'tavily',
        kind: 'news' as const,
        publishedAt: r.published_date,
      }));
    } catch {
      return [];
    }
  },
};

registerProvider(tavilyProvider);
