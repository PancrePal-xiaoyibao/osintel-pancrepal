import type { SearchResult } from '../search/types';

export type DedupStats = {
  inputCount: number;
  urlDeduped: number;
  titleDeduped: number;
  outputCount: number;
  dedupRate: number; // 0-1, percentage of items removed
};

export type Fingerprint = string;

export type DedupResult = {
  unique: SearchResult[];
  stats: DedupStats;
};
