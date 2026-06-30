/**
 * AnySearch web/news search adapter.
 *
 * Calls the AnySearch JSON-RPC 2.0 endpoint directly over HTTP so the server
 * has no dependency on the bundled CLI / Python runtime. Mirrors the
 * `anysearch` skill contract:
 *   POST https://api.anysearch.com/mcp
 *   { jsonrpc, id, method: "tools/call", params: { name: "search", arguments } }
 *   -> { result: { content: [{ type: "text", text }] } }
 *
 * The API key is OPTIONAL (anonymous access allowed with lower rate limits).
 * The response `text` is provider-formatted (markdown or JSON); this adapter
 * parses it tolerantly and never throws — on any failure it returns ok:false.
 */

const ANYSEARCH_DEFAULT_ENDPOINT = 'https://api.anysearch.com/mcp';
const HTTP_TIMEOUT_MS = 25000;

export type AnySearchItem = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedAt?: string;
};

export type AnySearchInput = {
  query: string;
  maxResults?: number;
  freshness?: 'day' | 'week' | 'month' | 'year';
  contentTypes?: string[];
  apiKey?: string;
  endpoint?: string;
  retries?: number;
};

export type AnySearchResult = { ok: boolean; items: AnySearchItem[]; reason?: string };

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

/**
 * Parse the provider text payload into structured items. Tries JSON first
 * (array of result objects, or `{ results: [...] }`), then falls back to
 * extracting markdown links `[title](url)` with any trailing text as snippet.
 */
export function parseAnySearchText(text: string): AnySearchItem[] {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];

  // 1) Structured JSON payload.
  try {
    const parsed = JSON.parse(trimmed);
    const list: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.results)
        ? parsed.results
        : Array.isArray(parsed?.data)
          ? parsed.data
          : [];
    const mapped = list
      .map((r) => {
        const url = String(r?.url || r?.link || r?.href || '').trim();
        const title = String(r?.title || r?.name || r?.heading || '').trim();
        if (!url || !title) return null;
        return {
          title,
          url,
          snippet: String(r?.snippet || r?.summary || r?.description || r?.content || '').trim(),
          source: r?.source ? String(r.source) : hostnameOf(url),
          publishedAt: r?.publishedAt || r?.date || r?.published_at || undefined
        } as AnySearchItem;
      })
      .filter((x): x is AnySearchItem => x !== null);
    if (mapped.length > 0) return mapped;
  } catch {
    // not JSON — fall through to markdown parsing
  }

  // 2) Markdown link extraction.
  const items: AnySearchItem[] = [];
  const seen = new Set<string>();
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    let match: RegExpExecArray | null;
    linkRe.lastIndex = 0;
    while ((match = linkRe.exec(line)) !== null) {
      const title = match[1].trim();
      const url = match[2].trim();
      if (!title || !url || seen.has(url)) continue;
      seen.add(url);
      // Snippet = the remainder of the line after the link, cleaned of markdown.
      const after = line.slice(match.index + match[0].length).replace(/[*_`>#-]/g, '').trim();
      items.push({ title, url, snippet: after, source: hostnameOf(url) });
    }
  }
  return items;
}

async function callAnySearch(
  endpoint: string,
  apiKey: string | undefined,
  args: Record<string, unknown>,
  retries: number
): Promise<string> {
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'search', arguments: args }
  };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`http_${response.status}`);
      }
      const data = await response.json();
      if (data?.error) {
        throw new Error(typeof data.error?.message === 'string' ? data.error.message : 'api_error');
      }
      const content = data?.result?.content;
      if (Array.isArray(content)) {
        const textItem = content.find((c: any) => c?.type === 'text');
        if (textItem?.text) return String(textItem.text);
      }
      return JSON.stringify(data?.result ?? {});
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('request_failed');
}

/** Run a single AnySearch web/news search. Never throws. */
export async function anySearch(input: AnySearchInput): Promise<AnySearchResult> {
  const query = (input.query || '').trim();
  if (!query) return { ok: false, items: [], reason: 'empty_query' };

  const endpoint = input.endpoint || ANYSEARCH_DEFAULT_ENDPOINT;
  const args: Record<string, unknown> = {
    query,
    max_results: input.maxResults ?? 10,
    content_types: input.contentTypes ?? ['news', 'web'],
    freshness: input.freshness ?? 'week'
  };

  try {
    const text = await callAnySearch(endpoint, input.apiKey, args, input.retries ?? 2);
    const items = parseAnySearchText(text);
    return { ok: true, items };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'request_failed';
    return { ok: false, items: [], reason };
  }
}
