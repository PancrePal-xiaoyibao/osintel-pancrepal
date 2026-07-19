import type { SearchResult } from '../search/types';
import type { FilterParams, FilterResult, FilterEngine, FilterPredicate, SortComparator } from './types';

// ---- Constants ----

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ---- Filter Predicate Builder ----

/**
 * Build a compound predicate from FilterParams.
 * Each dimension is AND-combined; omitted dimensions are skipped (always true).
 */
export function buildPredicate(params: FilterParams): (item: SearchResult) => boolean {
  const predicates: Array<(item: SearchResult) => boolean> = [];

  // Time range
  if (params.from || params.to) {
    const fromMs = params.from ? new Date(params.from).getTime() : 0;
    const toMs = params.to ? new Date(params.to).getTime() : Infinity;
    predicates.push((item) => {
      if (!item.publishedAt) return false; // items without a date can't pass time filter
      const ts = new Date(item.publishedAt).getTime();
      return !isNaN(ts) && ts >= fromMs && ts <= toMs;
    });
  }

  // Source name filter
  if (params.sources && params.sources.length > 0) {
    const sourceSet = new Set(params.sources.map((s) => s.toLowerCase()));
    predicates.push((item) => sourceSet.has((item.source || '').toLowerCase()));
  }

  // Provider ID filter
  if (params.providerIds && params.providerIds.length > 0) {
    const providerSet = new Set(params.providerIds.map((p) => p.toLowerCase()));
    predicates.push((item) => providerSet.has((item.providerId || '').toLowerCase()));
  }

  // Search kind filter
  if (params.kinds && params.kinds.length > 0) {
    const kindSet = new Set(params.kinds);
    predicates.push((item) => kindSet.has(item.kind));
  }

  // Credibility range filter (applied via extended 'credibility' field if present)
  if (params.minCredibility !== undefined || params.maxCredibility !== undefined) {
    const min = params.minCredibility ?? 0;
    const max = params.maxCredibility ?? 100;
    predicates.push((item) => {
      const score = (item as any).credibility ?? 0;
      return score >= min && score <= max;
    });
  }

  // Free-text search in title + snippet
  if (params.search) {
    const needle = params.search.toLowerCase();
    predicates.push(
      (item) =>
        (item.title || '').toLowerCase().includes(needle) ||
        (item.snippet || '').toLowerCase().includes(needle)
    );
  }

  if (predicates.length === 0) {
    return () => true;
  }

  return (item) => predicates.every((p) => p(item));
}

// ---- Sort Comparator Builder ----

/**
 * Build a sort comparator from FilterParams.
 */
export function buildComparator(params: FilterParams): (a: SearchResult, b: SearchResult) => number {
  const sort = params.sort || 'time';
  const order = params.order || 'desc';
  const sign = order === 'asc' ? 1 : -1;

  switch (sort) {
    case 'time': {
      return (a, b) => {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        if (isNaN(ta) && isNaN(tb)) return 0;
        if (isNaN(ta)) return 1; // no-date items sort last
        if (isNaN(tb)) return -1;
        return sign * (ta - tb);
      };
    }
    case 'credibility': {
      return (a, b) => {
        const ca = (a as any).credibility ?? 0;
        const cb = (b as any).credibility ?? 0;
        return sign * (ca - cb);
      };
    }
    case 'relevance': {
      // Relevance = simple heuristic: snippet length (proxy for detail) + recency
      return (a, b) => {
        const sa = (a.snippet || '').length + (a.publishedAt ? 1 : 0);
        const sb = (b.snippet || '').length + (b.publishedAt ? 1 : 0);
        return sign * (sa - sb);
      };
    }
    default:
      return () => 0;
  }
}

// ---- Filter Engine Implementation ----

/**
 * Create a FilterEngine instance.
 * Pure functions, no internal state — safe to reuse.
 */
export function createFilterEngine(): FilterEngine {
  return {
    apply(items: SearchResult[], params: FilterParams): FilterResult {
      const pageSize = Math.min(params.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
      const page = Math.max(params.page || DEFAULT_PAGE, 1);

      // 1. Filter
      const predicate = buildPredicate(params);
      const filtered = items.filter(predicate);

      // 2. Sort
      const comparator = buildComparator(params);
      const sorted = [...filtered].sort(comparator);

      // 3. Paginate
      const total = sorted.length;
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const paged = sorted.slice(start, start + pageSize);

      return {
        items: paged,
        total,
        page,
        pageSize,
        totalPages,
        applied: params,
      };
    },

    count(items: SearchResult[], params: FilterParams): number {
      const predicate = buildPredicate(params);
      return items.reduce((sum, item) => sum + (predicate(item) ? 1 : 0), 0);
    },
  };
}
