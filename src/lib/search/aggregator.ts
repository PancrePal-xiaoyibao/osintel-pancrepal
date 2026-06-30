import type { AggregateResult, ProviderStatus, SearchOptions, SearchResult } from './types';
import { getEnabledProviders } from './registry';
import { getCached, setCache, loadFromFile } from './cache';

type CircuitState = { failures: number; cooldownUntil: number };
const circuits = new Map<string, CircuitState>();

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000;

function isCircuitOpen(id: string): boolean {
  const state = circuits.get(id);
  if (!state) return false;
  if (Date.now() > state.cooldownUntil) {
    circuits.delete(id);
    return false;
  }
  return state.failures >= CIRCUIT_THRESHOLD;
}

function recordFailure(id: string): void {
  const state = circuits.get(id) || { failures: 0, cooldownUntil: 0 };
  state.failures += 1;
  state.cooldownUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  circuits.set(id, state);
}

function recordSuccess(id: string): void {
  circuits.delete(id);
}

export async function searchAggregate(
  query: string,
  options: SearchOptions & { env?: Record<string, string | undefined> } = {}
): Promise<AggregateResult> {
  const env = options.env ?? (process.env as Record<string, string | undefined>);

  // Check cache first
  const cached = getCached(query, options.kinds);
  if (cached) return cached;

  const enabled = getEnabledProviders(env, options.kinds).filter(
    (p) => !isCircuitOpen(p.id)
  );

  console.log(`[search] query="${query}" | ${enabled.length} providers enabled: ${enabled.map(p => p.id).join(', ')}`);

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

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      const { provider, results, durationMs } = outcome.value;
      allResults.push(...results);
      statuses.push({
        id: provider.id,
        kind: provider.kind,
        ok: true,
        count: results.length,
        durationMs,
      });
      recordSuccess(provider.id);
    } else {
      const provider = enabled[i];
      statuses.push({
        id: provider.id,
        kind: provider.kind,
        ok: false,
        count: 0,
        reason: outcome.reason instanceof Error ? outcome.reason.message : 'rejected',
      });
      recordFailure(provider.id);
    }
  }

  // Deduplicate by URL (case-insensitive)
  const seen = new Set<string>();
  const deduped = allResults.filter((r) => {
    const key = r.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result: AggregateResult = {
    results: deduped,
    providers: statuses,
    mode: deduped.length > 0 ? 'aggregate' : 'fallback',
  };

  // If no live results, try loading the last persisted file for this query
  if (result.mode === 'fallback') {
    const persisted = loadFromFile(query, options.kinds);
    if (persisted && persisted.results.length > 0) {
      persisted.mode = 'aggregate';
      persisted.cachedAt = 'disk';
      // Still set in-memory cache so we don't re-read disk on next poll
      setCache(query, options.kinds, persisted);
      return persisted;
    }
  }

  // Set cache and persist to disk for future reuse
  setCache(query, options.kinds, result);

  return result;
}
