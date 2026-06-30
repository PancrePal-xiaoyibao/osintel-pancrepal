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
  if (cached) {
    console.log(`[search] query="${query}" → cache HIT (${cached.results.length} results, served from memory)`);
    return cached;
  }

  const enabled = getEnabledProviders(env, options.kinds).filter(
    (p) => !isCircuitOpen(p.id)
  );

  const t0 = Date.now();
  console.log(`\n┌─ [search] query="${query}"`);
  console.log(`│  providers (${enabled.length}): ${enabled.map((p) => `${p.id}(${p.kind})`).join(', ')}`);

  const timeout = options.timeoutMs ?? 20000;
  const settled = await Promise.allSettled(
    enabled.map(async (provider) => {
      const start = Date.now();
      try {
        const results = await provider.search(query, { ...options, timeoutMs: timeout });
        const ms = Date.now() - start;
        // Live per-provider progress line as each finishes.
        const sample = results[0]?.title ? ` | top: "${results[0].title.slice(0, 60)}"` : '';
        console.log(`│  ✓ ${provider.id.padEnd(16)} ${String(results.length).padStart(3)} results  ${String(ms).padStart(5)}ms${sample}`);
        return { provider, results, durationMs: ms };
      } catch (err) {
        const ms = Date.now() - start;
        console.log(`│  ✗ ${provider.id.padEnd(16)} FAILED        ${String(ms).padStart(5)}ms | ${err instanceof Error ? err.message : 'error'}`);
        throw err;
      }
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

  const dupCount = allResults.length - deduped.length;
  console.log(`│  extract: ${allResults.length} raw → ${deduped.length} unique (${dupCount} duplicates removed)`);

  // Breakdown by kind for presentation visibility
  const byKind = deduped.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] || 0) + 1;
    return acc;
  }, {});
  const kindSummary = Object.entries(byKind).map(([k, n]) => `${k}:${n}`).join(' ');

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
      setCache(query, options.kinds, persisted);
      console.log(`│  ⚠ no live results — loaded ${persisted.results.length} from disk cache`);
      console.log(`└─ done in ${Date.now() - t0}ms (mode=disk-fallback)\n`);
      return persisted;
    }
  }

  // Set cache and persist to disk for future reuse
  setCache(query, options.kinds, result);

  const okCount = statuses.filter((s) => s.ok && s.count > 0).length;
  console.log(`│  present: ${deduped.length} items [${kindSummary}] from ${okCount}/${enabled.length} live sources`);
  console.log(`└─ done in ${Date.now() - t0}ms (mode=${result.mode})\n`);

  return result;
}
