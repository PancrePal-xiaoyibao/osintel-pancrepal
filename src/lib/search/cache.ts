import type { AggregateResult } from './types';
import fs from 'fs';
import path from 'path';

type CacheEntry = { result: AggregateResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Directory for persisted search results (relative to project root). */
const PERSIST_DIR = path.resolve(process.cwd(), 'data', 'search-cache');

export function cacheKey(query: string, kinds?: string[]): string {
  return `${query.toLowerCase().trim()}|${(kinds || []).sort().join(',')}`;
}

/** Safe filename derived from the cache key. */
function toFilename(key: string): string {
  return key.replace(/[^a-z0-9_-]/gi, '_').slice(0, 120) + '.json';
}

/** Path of the marker file recording the most recent search query. */
const LAST_QUERY_FILE = path.join(PERSIST_DIR, '_last-query.json');

/** Record the most recent search so it can be restored as the default on next startup. */
function recordLastQuery(query: string, key: string): void {
  try {
    fs.writeFileSync(
      LAST_QUERY_FILE,
      JSON.stringify({ query, key, timestamp: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch {
    /* non-critical */
  }
}

/** Return the most recent search query recorded on disk, if any. */
export function getLastQuery(): { query: string; key: string; timestamp: string } | null {
  try {
    if (!fs.existsSync(LAST_QUERY_FILE)) return null;
    return JSON.parse(fs.readFileSync(LAST_QUERY_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Load the most recent persisted search result: prefer the last-query marker,
 * then fall back to the most-recently-modified query file on disk.
 * Used on startup to seed the stream feed with the previous session's results.
 */
export function loadMostRecent(): { query: string; result: AggregateResult } | null {
  try {
    // 1. Try the explicit last-query marker.
    const last = getLastQuery();
    if (last) {
      const filePath = path.join(PERSIST_DIR, toFilename(last.key));
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (parsed.result?.results?.length) {
          return { query: last.query, result: parsed.result };
        }
      }
    }
    // 2. Fall back to the newest query file in the cache directory.
    if (!fs.existsSync(PERSIST_DIR)) return null;
    const candidates = fs.readdirSync(PERSIST_DIR)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .map((f) => ({ f, mtime: fs.statSync(path.join(PERSIST_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const c of candidates) {
      const parsed = JSON.parse(fs.readFileSync(path.join(PERSIST_DIR, c.f), 'utf-8'));
      if (parsed.result?.results?.length) {
        return { query: parsed.query || 'pancreatic cancer', result: parsed.result };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getCached(query: string, kinds?: string[]): AggregateResult | null {
  const entry = cache.get(cacheKey(query, kinds));
  if (!entry || Date.now() > entry.expiresAt) return null;
  return { ...entry.result, cachedAt: new Date(entry.expiresAt - DEFAULT_TTL_MS).toISOString() };
}

export function setCache(
  query: string,
  kinds: string[] | undefined,
  result: AggregateResult,
  ttlMs = DEFAULT_TTL_MS
): void {
  const key = cacheKey(query, kinds);
  cache.set(key, { result, expiresAt: Date.now() + ttlMs });

  // Persist to local file for offline reuse and post-processing.
  persistToFile(key, query, result);
}

/**
 * Load the most recent cached result for a query from disk.
 * Useful on cold start to serve stale-but-available data immediately.
 */
export function loadFromFile(query: string, kinds?: string[]): AggregateResult | null {
  try {
    const key = cacheKey(query, kinds);
    const filePath = path.join(PERSIST_DIR, toFilename(key));
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { query: string; timestamp: string; result: AggregateResult };
    return parsed.result ?? null;
  } catch {
    return null;
  }
}

/** Write a search result to a timestamped JSON file for long-term retention. */
function persistToFile(key: string, query: string, result: AggregateResult): void {
  try {
    if (!fs.existsSync(PERSIST_DIR)) {
      fs.mkdirSync(PERSIST_DIR, { recursive: true });
    }
    const payload = {
      query,
      timestamp: new Date().toISOString(),
      providersCount: result.providers.length,
      resultsCount: result.results.length,
      mode: result.mode,
      providers: result.providers,
      result
    };
    // Write a "latest" file (overwritten per query) for quick reload
    const latestPath = path.join(PERSIST_DIR, toFilename(key));
    fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2), 'utf-8');

    console.log(`[persist] saved ${result.results.length} results → data/search-cache/${toFilename(key)}`);

    // Record this as the most recent search → restored as default stream on next startup.
    recordLastQuery(query, key);

    // Also append to a time-series log (one line per search, NDJSON)
    const logPath = path.join(PERSIST_DIR, '_search-log.ndjson');
    const logEntry = JSON.stringify({
      t: payload.timestamp,
      q: query,
      n: result.results.length,
      providers: result.providers.map(p => `${p.id}:${p.count}`)
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf-8');
  } catch {
    // Non-critical: persistence failure should never block the feed.
  }
}
