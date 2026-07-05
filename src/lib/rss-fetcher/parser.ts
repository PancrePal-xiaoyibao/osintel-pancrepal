import type { SearchResult } from '../search/types';
import type { FeedSource, FeedMeta, FeedFetchResult } from './types';

let Parser: any = null;

async function getParser(): Promise<any> {
  if (!Parser) {
    const mod = await import('rss-parser');
    Parser = mod.default || mod;
  }
  return new (Parser as any)({
    customFields: {
      item: [
        ['dc:creator', 'creator'],
        ['dc:date', 'dcDate'],
        ['content:encoded', 'contentEncoded'],
      ],
    },
  });
}

/** Validate URL to prevent SSRF — block private/internal addresses */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
    // Block link-local
    if (hostname.startsWith('169.254.')) return false;
    // Block private IPv4 ranges
    if (hostname.match(/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/)) return false;
    // Block IPv6 private/local
    if (hostname.startsWith('fc') || hostname.startsWith('fd')) return false;
    // Block 0.0.0.0
    if (hostname === '0.0.0.0') return false;
    return true;
  } catch {
    return false;
  }
}

/** Fetch a URL using native fetch to allow AbortController timeout */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeItem(item: any, source: FeedSource): SearchResult {
  const title = (item.title || '').trim();
  const url = (item.link || '').trim();
  const snippet = (
    item.contentSnippet || item.contentEncoded || item.content || item.summary || ''
  ).replace(/<[^>]*>/g, '').trim().slice(0, 500);

  return {
    title,
    url,
    snippet,
    source: source.name,
    providerId: source.id,
    kind: source.kind,
    publishedAt: item.isoDate || item.pubDate || item.dcDate || undefined,
    doi: item.doi || undefined,
    pmid: item.pmid || undefined,
  };
}

export async function fetchFeed(source: FeedSource): Promise<FeedFetchResult> {
  const start = Date.now();
  try {
    if (!isSafeUrl(source.url)) {
      throw new Error(`URL blocked by SSRF protection: ${source.url}`);
    }

    const parser = await getParser();
    // rss-parser's parseURL doesn't support timeout natively,
    // so we use fetchWithTimeout to get the XML, then parseString
    const xml = await fetchWithTimeout(source.url, 15000);
    const raw = await parser.parseString(xml);

    const meta: FeedMeta = {
      title: (raw.title || '').trim(),
      description: (raw.description || '').trim(),
      link: (raw.link || '').trim(),
      language: raw.language || undefined,
      lastBuildDate: raw.lastBuildDate || undefined,
    };

    const items: SearchResult[] = (raw.items || [])
      .slice(0, source.maxItems)
      .map((item: any) => normalizeItem(item, source))
      .filter((r: SearchResult) => r.title && r.url);

    return {
      sourceId: source.id,
      ok: true,
      items,
      meta,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      sourceId: source.id,
      ok: false,
      items: [],
      durationMs: Date.now() - start,
      error: err.message || String(err),
    };
  }
}

export async function checkFeedHealth(source: FeedSource): Promise<{
  online: boolean;
  responseTimeMs: number;
  itemCount: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    if (!isSafeUrl(source.url)) {
      throw new Error(`URL blocked by SSRF protection`);
    }
    const parser = await getParser();
    const xml = await fetchWithTimeout(source.url, 10000);
    const raw = await parser.parseString(xml);
    const count = (raw.items || []).length;
    return { online: true, responseTimeMs: Date.now() - start, itemCount: count };
  } catch (err: any) {
    return {
      online: false,
      responseTimeMs: Date.now() - start,
      itemCount: 0,
      error: err.message || String(err),
    };
  }
}
