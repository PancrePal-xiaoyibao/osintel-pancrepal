import type { SearchResult } from '../search/types';
import type { DedupStats, DedupResult, Fingerprint } from './types';

/** Normalize text for similarity comparison */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s]/g, ' ') // keep CJK chars + word chars
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stopwords to strip before similarity check */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'has', 'have', 'had', 'it', 'its', 'this', 'that', 'these', 'those',
  'study', 'trial', 'research', 'analysis', 'review', 'new', 'novel',
]);

/** Generate bigrams from tokenized text */
function bigrams(tokens: string[]): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    set.add(`${tokens[i]}|${tokens[i + 1]}`);
  }
  return set;
}

/** Dice coefficient: 2 * |A ∩ B| / (|A| + |B|). Range [0, 1]. */
export function diceCoefficient(a: string, b: string): number {
  const tokensA = normalize(a).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const tokensB = normalize(b).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const bgA = bigrams(tokensA);
  const bgB = bigrams(tokensB);
  let intersection = 0;
  for (const bg of bgA) {
    if (bgB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bgA.size + bgB.size);
}

const SIMILARITY_THRESHOLD = 0.85;

/** Generate a stable fingerprint for a result item */
export function fingerprint(item: SearchResult): Fingerprint {
  const key = `${normalize(item.title)}|${normalize(item.url)}|${item.source}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

/**
 * LRU fingerprint cache.
 * Tracks seen fingerprints to avoid re-processing known items.
 */
export class FingerprintCache {
  private cache: Map<Fingerprint, number> = new Map();
  private maxSize: number;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
  }

  has(fp: Fingerprint): boolean {
    return this.cache.has(fp);
  }

  add(fp: Fingerprint): void {
    // Refresh position: delete and re-add to move to end (most recent)
    this.cache.delete(fp);
    this.cache.set(fp, Date.now());
    // Evict oldest (first item in insertion order) if over limit
    if (this.cache.size > this.maxSize) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
  }

  evictOlder(ttlMs: number): void {
    const cutoff = Date.now() - ttlMs;
    for (const [fp, ts] of this.cache) {
      if (ts < cutoff) this.cache.delete(fp);
    }
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Deduplicate search results using a two-layer strategy:
 * L1: Exact URL match (100% precision)
 * L2: Title Dice coefficient >= 0.85
 *
 * Order-preserving: keeps the first occurrence of each unique item.
 */
export function dedup(
  items: SearchResult[],
  cache?: FingerprintCache,
  threshold: number = SIMILARITY_THRESHOLD
): DedupResult {
  const seenUrls = new Set<string>();
  const seenFps = new Set<Fingerprint>();
  const unique: SearchResult[] = [];
  let urlDeduped = 0;
  let titleDeduped = 0;

  // Pre-fill from fingerprint cache
  if (cache) {
    cache.evictOlder(24 * 60 * 60 * 1000); // 24h TTL
  }

  for (const item of items) {
    const normalizedUrl = normalize(item.url);

    // L1: Exact URL match
    if (seenUrls.has(normalizedUrl)) {
      urlDeduped++;
      continue;
    }

    // L2: Fingerprint cache check
    const fp = fingerprint(item);
    if (cache?.has(fp) || seenFps.has(fp)) {
      // Check title similarity against all kept items more carefully
      const isDuplicate = unique.some((kept) => {
        if (kept.source === item.source) return false; // same source is fine
        return diceCoefficient(kept.title, item.title) >= threshold;
      });
      if (isDuplicate) {
        titleDeduped++;
        continue;
      }
    }

    // Keep it
    seenUrls.add(normalizedUrl);
    seenFps.add(fp);
    if (cache) cache.add(fp);
    unique.push(item);
  }

  const outputCount = unique.length;
  const inputCount = items.length;
  const dedupRate = inputCount > 0 ? (inputCount - outputCount) / inputCount : 0;

  return {
    unique,
    stats: {
      inputCount,
      urlDeduped,
      titleDeduped,
      outputCount,
      dedupRate,
    },
  };
}
