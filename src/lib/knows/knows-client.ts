/**
 * Shared KnowS evidence search client.
 *
 * Wraps the public KnowS OpenAPI (https://api.nullht.com/v1) for all six
 * evidence sources. Used as the base search capability across the project:
 * the news pipeline, the personalized "My" routes, and the AI assistant.
 *
 * Contract notes (from the knows-evidence-search skill):
 * - Each source is `POST /evidences/ai_search_<source>` with body `{ query }`.
 * - Response is `{ question_id, evidences[] }`; unknown fields are preserved.
 * - `KNOWS_API_KEY` is optional (anonymous tier allowed); a key raises limits.
 * - Multi-source searches must run serially to avoid HTTP 429 at the gateway.
 */

export type KnowsSource =
  | 'paper_en'
  | 'paper_cn'
  | 'meeting'
  | 'guide'
  | 'trial'
  | 'package_insert';

export const KNOWS_DEFAULT_BASE_URL = 'https://api.nullht.com/v1';

export const KNOWS_SOURCES: Record<KnowsSource, { label: string; endpoint: string; maxItems: number }> = {
  paper_en: { label: 'English papers', endpoint: '/evidences/ai_search_paper_en', maxItems: 40 },
  paper_cn: { label: 'Chinese papers', endpoint: '/evidences/ai_search_paper_cn', maxItems: 40 },
  meeting: { label: 'Conference / meeting abstracts', endpoint: '/evidences/ai_search_meeting', maxItems: 5 },
  guide: { label: 'Guidelines', endpoint: '/evidences/ai_search_guide', maxItems: 5 },
  trial: { label: 'Clinical trials', endpoint: '/evidences/ai_search_trial', maxItems: 5 },
  package_insert: { label: 'Drug package inserts', endpoint: '/evidences/ai_search_package_insert', maxItems: 5 }
};

export const KNOWS_SOURCE_IDS = Object.keys(KNOWS_SOURCES) as KnowsSource[];

export function isKnowsSource(value: unknown): value is KnowsSource {
  return typeof value === 'string' && value in KNOWS_SOURCES;
}

export type KnowsRawEvidence = Record<string, unknown> & {
  id?: string;
  title?: string;
};

export type KnowsSearchResult = {
  ok: boolean;
  source: KnowsSource;
  questionId?: string;
  evidences: KnowsRawEvidence[];
  reason?: string;
  raw?: unknown;
};

export type KnowsSearchInput = {
  source: KnowsSource;
  query: string;
  apiKey?: string;
  baseUrl?: string;
  retries?: number;
  timeoutMs?: number;
};

/**
 * Normalize the base URL so it always ends in the `/v1` API root regardless of
 * whether the caller passed `https://api.nullht.com` or
 * `https://api.nullht.com/v1`.
 */
export function normalizeBaseUrl(baseUrl?: string): string {
  const raw = (baseUrl || KNOWS_DEFAULT_BASE_URL).trim().replace(/\/+$/g, '');
  if (!raw) return KNOWS_DEFAULT_BASE_URL;
  return /\/v\d+$/.test(raw) ? raw : `${raw}/v1`;
}

async function postJsonWithRetry(
  url: string,
  apiKey: string | undefined,
  payload: unknown,
  retries: number,
  timeoutMs: number
): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const text = await response.text();
      const parsed = text.trim() ? safeParse(text) : undefined;
      if (!response.ok) {
        // 429 is retryable; other 4xx are not.
        if (response.status === 429 && attempt < retries - 1) {
          lastError = new Error(`http_429`);
        } else {
          throw new Error(`http_${response.status}`);
        }
      } else {
        return parsed;
      }
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('request_failed');
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Run a single-source KnowS evidence search. */
export async function knowsSearch(input: KnowsSearchInput): Promise<KnowsSearchResult> {
  const query = (input.query || '').trim();
  if (!query) {
    return { ok: false, source: input.source, evidences: [], reason: 'empty_query' };
  }
  if (!isKnowsSource(input.source)) {
    return { ok: false, source: input.source, evidences: [], reason: 'invalid_source' };
  }

  const base = normalizeBaseUrl(input.baseUrl);
  const url = `${base}${KNOWS_SOURCES[input.source].endpoint}`;

  const attempt = async (apiKey: string | undefined) => {
    const raw = await postJsonWithRetry(
      url,
      apiKey,
      { query },
      input.retries ?? 3,
      input.timeoutMs ?? 25000
    );
    const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const evidences = Array.isArray(obj.evidences) ? (obj.evidences as KnowsRawEvidence[]) : [];
    return {
      ok: true as const,
      source: input.source,
      questionId: typeof obj.question_id === 'string' ? obj.question_id : undefined,
      evidences,
      raw
    };
  };

  try {
    return await attempt(input.apiKey);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'request_failed';
    // A bad/expired key must not block evidence search: retry anonymously.
    if (input.apiKey && (reason === 'http_401' || reason === 'http_403')) {
      try {
        return await attempt(undefined);
      } catch (anonError) {
        const anonReason = anonError instanceof Error ? anonError.message : 'request_failed';
        return { ok: false, source: input.source, evidences: [], reason: anonReason };
      }
    }
    return { ok: false, source: input.source, evidences: [], reason };
  }
}

/**
 * Run multiple sources serially (never in parallel) to respect the gateway
 * rate limits. Returns one result per requested source in order.
 */
export async function knowsMultiSearch(input: {
  sources: KnowsSource[];
  query: string;
  apiKey?: string;
  baseUrl?: string;
  delayMs?: number;
}): Promise<KnowsSearchResult[]> {
  const results: KnowsSearchResult[] = [];
  const delay = input.delayMs ?? 350;
  for (let i = 0; i < input.sources.length; i += 1) {
    const source = input.sources[i];
    // eslint-disable-next-line no-await-in-loop
    const result = await knowsSearch({
      source,
      query: input.query,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl
    });
    results.push(result);
    if (i < input.sources.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return results;
}
