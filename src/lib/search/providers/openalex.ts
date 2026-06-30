import type { SearchProvider, SearchOptions, SearchResult } from '../types';
import { registerProvider } from '../registry';

/**
 * Reconstruct abstract text from OpenAlex inverted index format.
 * The inverted index maps words to their position indices in the abstract.
 */
function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined
): string {
  if (!invertedIndex) return '';

  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }

  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, w]) => w).join(' ');
}

const openAlexProvider: SearchProvider = {
  id: 'openalex',
  kind: 'academic',

  isConfigured(_env) {
    return true; // no key needed, public API
  },

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    try {
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${options.maxResults ?? 10}&select=id,display_name,doi,publication_year,abstract_inverted_index,primary_location`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'pancreas-osintel/0.1 (mailto:dev@example.com)',
        },
        signal: AbortSignal.timeout(options.timeoutMs ?? 20000),
      });

      if (!res.ok) return [];

      const json = await res.json() as {
        results?: Array<{
          id?: string;
          display_name?: string;
          doi?: string;
          publication_year?: number;
          abstract_inverted_index?: Record<string, number[]>;
          primary_location?: {
            source?: { display_name?: string };
          };
        }>;
      };

      if (!json.results || !Array.isArray(json.results)) return [];

      return json.results.map((item) => {
        const doi = item.doi
          ? item.doi.replace('https://doi.org/', '')
          : undefined;

        return {
          title: item.display_name ?? '',
          url: doi ? `https://doi.org/${doi}` : item.id ?? '',
          snippet: reconstructAbstract(item.abstract_inverted_index),
          source: item.primary_location?.source?.display_name ?? 'OpenAlex',
          providerId: 'openalex',
          kind: 'academic' as const,
          publishedAt: item.publication_year
            ? `${item.publication_year}-01-01`
            : undefined,
          doi,
        };
      });
    } catch {
      return [];
    }
  },
};

registerProvider(openAlexProvider);
