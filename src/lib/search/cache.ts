import type { AggregateResult } from './types';

type CacheEntry = { result: AggregateResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function cacheKey(query: string, kinds?: string[]): string {
  return `${query.toLowerCase().trim()}|${(kinds || []).sort().join(',')}`;
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
  cache.set(cacheKey(query, kinds), { result, expiresAt: Date.now() + ttlMs });
}
