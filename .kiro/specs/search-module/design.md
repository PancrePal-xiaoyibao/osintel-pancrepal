# Search Module — Design

## Overview

This document details the technical design for the unified, pluggable search
module defined in `requirements.md`. It replaces the ad-hoc per-source wiring in
`src/lib/news/aggregate.ts` with a formal provider registry, common result
shape, and a shared aggregator consumed by the news feed, personalized hub, AI
assistant, and floating chatbot.

The module lives at `src/lib/search/` and exposes one entry point:
`searchAggregate(query, options)`. Each external search source is a `SearchProvider`
implementation registered in the provider registry.

---

## 1. Core Types (`src/lib/search/types.ts`)

```typescript
/** Provider category. */
export type SearchKind = 'web' | 'news' | 'academic' | 'trial' | 'guideline';

/** Normalized result every provider returns. */
export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;          // human-friendly source name
  providerId: string;      // stable provider id (e.g. 'tavily')
  kind: SearchKind;
  publishedAt?: string;    // ISO-8601 if known
  doi?: string;
  pmid?: string;
  nct?: string;
};

/** Options passed to a provider's search method. */
export type SearchOptions = {
  maxResults?: number;       // per-provider cap (default 10)
  freshness?: 'day' | 'week' | 'month' | 'year';
  kinds?: SearchKind[];      // caller can restrict to certain kinds
  timeoutMs?: number;        // per-provider timeout (default 20000)
};

/** Provider interface — every adapter implements this. */
export interface SearchProvider {
  id: string;
  kind: SearchKind;
  /** True when the provider can run (key present or anonymous-capable). */
  isConfigured(env: Record<string, string | undefined>): boolean;
  /** Execute the search. Must never throw — return [] on failure. */
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}

/** Per-provider execution report. */
export type ProviderStatus = {
  id: string;
  kind: SearchKind;
  ok: boolean;
  count: number;
  reason?: string;        // only on failure
  durationMs?: number;
};

/** Final aggregate output. */
export type AggregateResult = {
  results: SearchResult[];
  providers: ProviderStatus[];
  mode: 'aggregate' | 'fallback';
  cachedAt?: string;
};
```

---

## 2. Provider Registry (`src/lib/search/registry.ts`)

```typescript
import type { SearchProvider } from './types';

const providers: SearchProvider[] = [];

export function registerProvider(provider: SearchProvider): void {
  providers.push(provider);
}

export function getEnabledProviders(
  env: Record<string, string | undefined>,
  kindsFilter?: SearchKind[]
): SearchProvider[] {
  return providers.filter((p) => {
    if (env[`NEWS_DISABLE_${p.id.toUpperCase()}`] === '1') return false;
    if (!p.isConfigured(env)) return false;
    if (kindsFilter && !kindsFilter.includes(p.kind)) return false;
    return true;
  });
}

export function getAllProviders(): SearchProvider[] {
  return [...providers];
}
```

On server startup, all provider modules are imported and call `registerProvider`.

---

## 3. Provider Implementations

Each lives in `src/lib/search/providers/<id>.ts` and exports a single
`SearchProvider`. The module self-registers via a top-level
`registerProvider(...)` call in a central `src/lib/search/providers/index.ts`
barrel.

### 3.1 Provider list (v1)

| id | kind | API | Key env var | Anonymous? |
|----|------|-----|-------------|------------|
| `knows` | academic / guideline / trial | `api.nullht.com/v1` | `KNOWS_API_KEY` | Yes |
| `pubmed` | academic | `ebi.ac.uk/europepmc` | — | Yes (no key) |
| `clinicaltrials` | trial | `clinicaltrials.gov/api/v2` | — | Yes (no key) |
| `anysearch` | web / news | `api.anysearch.com/mcp` | `ANYSEARCH_API_KEY` | Yes |
| `tavily` | news | `api.tavily.com/search` | `TAVILY_API_KEY` | No |
| `serper` | web | `google.serper.dev/search` | `SERPER_API_KEY` | No |
| `google_cse` | web | `googleapis.com/customsearch` | `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` | No |
| `metaso` | web / news | TBD (秘塔 API) | `METASO_API_KEY` | No |
| `brave` | web | `api.search.brave.com` | `BRAVE_API_KEY` | No |

### 3.2 Provider template

```typescript
// src/lib/search/providers/tavily.ts
import { registerProvider, type SearchProvider, type SearchResult, type SearchOptions } from '../index';

const tavily: SearchProvider = {
  id: 'tavily',
  kind: 'news',
  isConfigured(env) { return !!env.TAVILY_API_KEY; },
  async search(query, options) {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        topic: 'news',
        days: options.freshness === 'day' ? 1 : options.freshness === 'week' ? 7 : 30,
        max_results: options.maxResults ?? 10,
        include_answer: false
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 20000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any): SearchResult => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.content || '',
      source: r.source || new URL(r.url).hostname,
      providerId: 'tavily',
      kind: 'news',
      publishedAt: r.published_date
    })).filter((r: SearchResult) => r.url && r.title);
  }
};

registerProvider(tavily);
```

### 3.3 Existing adapters migration

The current adapters (`knows-client.ts`, `europepmc-adapter.ts`,
`ctgov-adapter.ts`, `anysearch-adapter.ts`) will be wrapped as thin
`SearchProvider` adapters that delegate to the existing functions. This avoids
rewriting tested code.

---

## 4. Aggregator (`src/lib/search/aggregator.ts`)

```typescript
import { getEnabledProviders } from './registry';
import type { AggregateResult, ProviderStatus, SearchOptions, SearchResult } from './types';

type CircuitState = { failures: number; cooldownUntil: number };
const circuits = new Map<string, CircuitState>();

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;

function isCircuitOpen(id: string): boolean {
  const state = circuits.get(id);
  if (!state) return false;
  if (Date.now() > state.cooldownUntil) { circuits.delete(id); return false; }
  return state.failures >= CIRCUIT_THRESHOLD;
}

function recordFailure(id: string) {
  const state = circuits.get(id) || { failures: 0, cooldownUntil: 0 };
  state.failures += 1;
  state.cooldownUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  circuits.set(id, state);
}

function recordSuccess(id: string) { circuits.delete(id); }

export async function searchAggregate(
  query: string,
  options: SearchOptions & { env?: Record<string, string | undefined> } = {}
): Promise<AggregateResult> {
  const env = options.env ?? process.env as Record<string, string | undefined>;
  const enabled = getEnabledProviders(env, options.kinds)
    .filter((p) => !isCircuitOpen(p.id));

  const timeout = options.timeoutMs ?? 20000;
  const settled = await Promise.allSettled(
    enabled.map(async (provider) => {
      const start = Date.now();
      const results = await provider.search(query, { ...options, timeoutMs: timeout });
      return { provider, results, durationMs: Date.now() - start };
    })
  );

  const allResults: SearchResult[] = [];
  const statuses: ProviderStatus[] = [];

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      const { provider, results, durationMs } = outcome.value;
      allResults.push(...results);
      statuses.push({ id: provider.id, kind: provider.kind, ok: true, count: results.length, durationMs });
      recordSuccess(provider.id);
    } else {
      // Provider threw (shouldn't happen if they follow contract, but defensive)
      const id = enabled[settled.indexOf(outcome)]?.id || 'unknown';
      const kind = enabled[settled.indexOf(outcome)]?.kind || 'web';
      statuses.push({ id, kind, ok: false, count: 0, reason: 'rejected' });
      recordFailure(id);
    }
  }

  // Deduplicate by URL (exact match)
  const seen = new Set<string>();
  const deduped = allResults.filter((r) => {
    const key = r.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    results: deduped,
    providers: statuses,
    mode: deduped.length > 0 ? 'aggregate' : 'fallback'
  };
}
```

---

## 5. Caching Layer (`src/lib/search/cache.ts`)

```typescript
type CacheEntry = { result: AggregateResult; expiresAt: number };
const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function cacheKey(query: string, kinds?: string[]): string {
  return `${query.toLowerCase().trim()}|${(kinds || []).sort().join(',')}`;
}

export function getCached(query: string, kinds?: string[]): AggregateResult | null {
  const entry = cache.get(cacheKey(query, kinds));
  if (!entry || Date.now() > entry.expiresAt) return null;
  return { ...entry.result, cachedAt: new Date(entry.expiresAt - DEFAULT_TTL_MS).toISOString() };
}

export function setCache(query: string, kinds: string[] | undefined, result: AggregateResult, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(cacheKey(query, kinds), { result, expiresAt: Date.now() + ttlMs });
}
```

---

## 6. Query-Intent Routing (`src/lib/search/intent.ts`)

Simple keyword/regex-based intent detection for v1:

```typescript
export type QueryIntent = 'gene' | 'drug' | 'trial' | 'guideline' | 'general';

const patterns: Array<{ intent: QueryIntent; re: RegExp }> = [
  { intent: 'gene', re: /\b(KRAS|BRCA|TP53|CDKN2A|SMAD4|PALB2|ATM|BRAF|PIK3CA|HER2|EGFR)\b/i },
  { intent: 'drug', re: /\b(FOLFIRINOX|nab-paclitaxel|gemcitabine|olaparib|pembrolizumab|ADC|inhibitor|抑制剂)\b/i },
  { intent: 'trial', re: /\b(NCT\d+|clinical trial|Phase [I-V]|招募|recruiting)\b/i },
  { intent: 'guideline', re: /\b(NCCN|ESMO|CSCO|guideline|指南|共识)\b/i },
];

export function detectIntent(query: string): QueryIntent {
  for (const { intent, re } of patterns) {
    if (re.test(query)) return intent;
  }
  return 'general';
}

export function intentToKinds(intent: QueryIntent): SearchKind[] | undefined {
  switch (intent) {
    case 'gene':
    case 'drug':     return ['academic', 'trial', 'web'];
    case 'trial':    return ['trial', 'academic'];
    case 'guideline': return ['guideline', 'academic'];
    default:         return undefined; // all
  }
}
```

---

## 7. Integration with Existing Code

### 7.1 News feed (`server.ts` / `src/lib/news/refresh.ts`)

`refreshNewsWindows` will call `searchAggregate(query, { freshness })` then
normalize its `SearchResult[]` into `NewsNormalizedItem[]` using the existing
`normalizeKnowsEvidencePayload` (or a thin wrapper). The windowing, ranking,
dedupe, and fallback logic remain unchanged.

### 7.2 Personalized routes (`/api/personal/*`)

The `/api/personal/feed` and `/api/personal/assistant` routes will call
`searchAggregate(profileQuery, { kinds: ['academic', 'trial'] })` for grounding.

### 7.3 Floating chatbot (`/api/osint/chat-custom`)

The chatbot route will call `searchAggregate(userMessage, { maxResults: 5 })` to
ground its response and attach `sourceEvidence` links.

### 7.4 Frontend (`OSINTFeedView`)

The sidebar already shows `newsSources` chips (provider status). This extends
naturally to the new `ProviderStatus[]` shape — just map `providers` to chips.

---

## 8. Environment Variables (`.env.example`)

```env
# --- Search Module (all optional) ---

# KnowS evidence search (anonymous tier allowed)
KNOWS_API_KEY=""
KNOWS_BASE_URL="https://api.nullht.com"

# AnySearch web/news (anonymous tier allowed)
ANYSEARCH_API_KEY=""
# ANYSEARCH_ENDPOINT="https://api.anysearch.com/mcp"

# Tavily news search
TAVILY_API_KEY=""

# Google web search via Serper.dev
SERPER_API_KEY=""

# Google CSE (alternative to Serper)
# GOOGLE_API_KEY=""
# GOOGLE_CSE_ID=""

# Metaso / 秘塔 (Chinese AI search, optional)
# METASO_API_KEY=""

# Brave Search (optional)
# BRAVE_API_KEY=""

# Disable a provider even if configured (set to "1")
# NEWS_DISABLE_TAVILY="0"
# NEWS_DISABLE_SERPER="0"
# NEWS_DISABLE_ANYSEARCH="0"
```

---

## 9. File Structure

```
src/lib/search/
├── types.ts              # SearchProvider, SearchResult, AggregateResult, etc.
├── registry.ts           # provider registration + enabled filtering
├── aggregator.ts         # searchAggregate() — main entry point
├── cache.ts              # in-memory query cache (TTL-based)
├── intent.ts             # query-intent routing (gene/drug/trial/guideline/general)
├── providers/
│   ├── index.ts          # barrel import for all providers (self-registers)
│   ├── knows.ts          # wraps existing knows-client
│   ├── pubmed.ts         # wraps existing europepmc-adapter
│   ├── clinicaltrials.ts # wraps existing ctgov-adapter
│   ├── anysearch.ts      # wraps existing anysearch-adapter
│   ├── tavily.ts         # NEW
│   ├── serper.ts         # NEW
│   ├── google-cse.ts     # NEW (optional)
│   ├── metaso.ts         # NEW (optional, stub)
│   └── brave.ts          # NEW (optional)
└── index.ts              # re-exports searchAggregate + types for consumers
```

---

## 10. Migration Plan

1. Create `src/lib/search/types.ts`, `registry.ts`, `aggregator.ts`, `cache.ts`, `intent.ts`.
2. Wrap existing adapters as providers in `providers/` (thin delegation, no rewrite).
3. Implement new providers: `tavily.ts`, `serper.ts`, `brave.ts`, stubs for `metaso.ts` and `google-cse.ts`.
4. Replace `src/lib/news/aggregate.ts` internals with a call to `searchAggregate`.
5. Wire `server.ts` routes to pass env through and expose `ProviderStatus[]`.
6. Update `.env.example` and README.
7. Verify: type-check, build, live test (start server, confirm multi-source feed).
8. Commit and push.

---

## 11. Traceability Matrix

| Requirement | Design Section |
|-------------|----------------|
| REQ-1 (Provider interface) | §1 Core Types |
| REQ-2 (Registry/enablement) | §2 Registry |
| REQ-3 (Web providers) | §3.1, §3.2, §8 |
| REQ-4 (Academic providers) | §3.1, §3.3 |
| REQ-5 (Configuration) | §8 |
| REQ-6 (Parallel/graceful) | §4 Aggregator (circuit breaker, settled) |
| REQ-7 (Normalization/dedupe) | §4 (dedupe), §7.1 (normalization) |
| REQ-8 (Caching/5-min) | §5 |
| REQ-9 (Intent routing) | §6 |
| REQ-10 (Reusability) | §7 |
| REQ-11 (Observability) | §4 (ProviderStatus), §7.4 |
| REQ-12 (Citation safety) | §1 (SearchResult requires url), §3.3 |
