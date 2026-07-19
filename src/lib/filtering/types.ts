import type { SearchResult, SearchKind } from '../search/types';

// ---- Filter Parameters ----

/** Sorting dimension */
export type SortBy = 'time' | 'credibility' | 'relevance';

/** Sort direction */
export type SortOrder = 'asc' | 'desc';

/**
 * Parameters for filtering and sorting search results.
 * All fields are optional — omitted fields mean "no filter on that dimension".
 */
export type FilterParams = {
  /** ISO-8601 datetime lower bound (inclusive) */
  from?: string;
  /** ISO-8601 datetime upper bound (inclusive) */
  to?: string;
  /** Restrict to specific source names (exact match) */
  sources?: string[];
  /** Restrict to specific provider IDs (exact match) */
  providerIds?: string[];
  /** Restrict to specific search kinds */
  kinds?: SearchKind[];
  /** Minimum credibility score (0-100, inclusive) */
  minCredibility?: number;
  /** Maximum credibility score (0-100, inclusive) */
  maxCredibility?: number;
  /** Field to sort by */
  sort?: SortBy;
  /** Sort direction */
  order?: SortOrder;
  /** Pagination: 1-based page number */
  page?: number;
  /** Pagination: items per page (default 20, max 100) */
  pageSize?: number;
  /** Free-text search within title + snippet */
  search?: string;
};

// ---- Filter Result ----

/** Paginated filter output */
export type FilterResult = {
  /** Filtered, sorted, and paginated items */
  items: SearchResult[];
  /** Total items matching filter (before pagination) */
  total: number;
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total pages */
  totalPages: number;
  /** The filter params applied (for response round-tripping) */
  applied: FilterParams;
};

// ---- Filter Engine Interface ----

/**
 * Immutable filter engine: takes items + params, returns filtered result.
 * Implementations must be synchronous and not mutate input.
 */
export interface FilterEngine {
  /** Apply filters and sorting, return paginated result */
  apply(items: SearchResult[], params: FilterParams): FilterResult;

  /** Get only the count of matching items (no pagination overhead) */
  count(items: SearchResult[], params: FilterParams): number;
}

// ---- Internal helpers (exported for testing) ----

export type PredicateFn = (item: SearchResult) => boolean;

/**
 * Build a compound filter predicate from FilterParams.
 * Returns a function that tests whether a SearchResult matches all criteria.
 */
export type FilterPredicate = (params: FilterParams) => PredicateFn;

/**
 * Sort comparator factory.
 * Returns a comparator function for Array.sort().
 */
export type SortComparator = (params: FilterParams) => (a: SearchResult, b: SearchResult) => number;
