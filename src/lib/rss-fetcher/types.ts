import type { SearchResult, SearchKind } from '../search/types';

/** Feed format types */
export type FeedFormat = 'rss' | 'atom';

/** Configuration for a single RSS/Atom source */
export type FeedSource = {
  id: string;
  name: string;
  url: string;
  kind: SearchKind;
  format?: FeedFormat; // auto-detect if omitted
  credibilityBase?: number; // base score 0-100
  enabled: boolean;
  refreshIntervalMinutes: number; // default 60
  maxItems: number; // per-fetch cap, default 50
  createdAt: string; // ISO-8601
  updatedAt: string;
  lastFetchedAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  consecutiveFailures: number;
  itemCount: number;
};

/** Parsed feed metadata */
export type FeedMeta = {
  title: string;
  description: string;
  link: string;
  language?: string;
  lastBuildDate?: string;
};

/** Result of fetching a single feed source */
export type FeedFetchResult = {
  sourceId: string;
  ok: boolean;
  items: SearchResult[];
  meta?: FeedMeta;
  durationMs: number;
  error?: string;
};

/** Health status for a feed source */
export type FeedHealth = {
  sourceId: string;
  online: boolean;
  responseTimeMs: number;
  itemCount: number;
  lastChecked: string;
  error?: string;
};
