import fs from 'fs';
import path from 'path';
import type { SearchResult } from '../search/types';
import type { DedupStats } from '../dedup/types';

const CACHE_DIR = path.resolve(process.cwd(), 'data', 'search-cache');
const FEED_CACHE_FILE = 'rss-feed-cache.json';

export type FeedCacheEntry = {
  updatedAt: string;
  items: SearchResult[];
  totalUnique: number;
  totalRaw: number;
  dedupRate: number;
  stats: DedupStats;
  sourceCount: number;
};

function ensureDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function readFeedCache(): FeedCacheEntry | null {
  try {
    ensureDir();
    const filePath = path.join(CACHE_DIR, FEED_CACHE_FILE);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as FeedCacheEntry;
  } catch {
    return null;
  }
}

export function writeFeedCache(entry: FeedCacheEntry): void {
  ensureDir();
  const filePath = path.join(CACHE_DIR, FEED_CACHE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
}

export function listCacheFiles(): string[] {
  try {
    ensureDir();
    return fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
}

export function readCacheFile(filename: string): unknown | null {
  try {
    const filePath = path.join(CACHE_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCacheDir(): string {
  return CACHE_DIR;
}
