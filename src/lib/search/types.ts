/** Provider category. */
export type SearchKind = 'web' | 'news' | 'academic' | 'trial' | 'guideline';

/** Normalized result every provider returns. */
export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;          // human-friendly source name
  providerId: string;      // stable provider id (e.g. 'tavily')
  kind: SearchKind;
  publishedAt?: string;    // ISO-8601 if known
  doi?: string;
  pmid?: string;
  nct?: string;
};

/** Options passed to a provider's search method. */
export type SearchOptions = {
  maxResults?: number;       // per-provider cap (default 10)
  freshness?: 'day' | 'week' | 'month' | 'year';
  kinds?: SearchKind[];      // caller can restrict to certain kinds
  timeoutMs?: number;        // per-provider timeout (default 20000)
};

/** Provider interface — every adapter implements this. */
export interface SearchProvider {
  id: string;
  kind: SearchKind;
  /** True when the provider can run (key present or anonymous-capable). */
  isConfigured(env: Record<string, string | undefined>): boolean;
  /** Execute the search. Must never throw — return [] on failure. */
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}

/** Per-provider execution report. */
export type ProviderStatus = {
  id: string;
  kind: SearchKind;
  ok: boolean;
  count: number;
  reason?: string;        // only on failure
  durationMs?: number;
};

/** Final aggregate output. */
export type AggregateResult = {
  results: SearchResult[];
  providers: ProviderStatus[];
  mode: 'aggregate' | 'fallback';
  cachedAt?: string;
};
