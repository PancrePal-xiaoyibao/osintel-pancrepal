import cron, { type ScheduledTask } from 'node-cron';
import { listSources, fetchFeed, recordFetch } from '../rss-fetcher/index';
import { dedup, FingerprintCache } from '../dedup/index';
import { writeFeedCache, type FeedCacheEntry } from '../cache/index';
import type { FeedSource } from '../rss-fetcher/types';

export type SchedulerStatus = {
  running: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  taskCount: number;
  activeTasks: number;
  totalSources: number;
  enabledSources: number;
  healthySources: number;
};

class Semaphore {
  private current = 0;

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    while (this.current >= this.max) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.current++;
  }

  release(): void {
    this.current = Math.max(0, this.current - 1);
  }

  get active(): number {
    return this.current;
  }
}

export class FeedScheduler {
  private fingerprintCache = new FingerprintCache(10000);
  private cronJob: ScheduledTask | null = null;
  private semaphore = new Semaphore(5);
  private lastRunAt: string | null = null;
  private nextRunAt: string | null = null;
  private activeTasks = 0;
  private running = false;

  /** Start the scheduler — checks sources every minute for scheduled refresh */
  start(cronExpression = '* * * * *'): void {
    if (this.cronJob) return;
    this.running = true;

    this.cronJob = cron.schedule(cronExpression, async () => {
      const now = Date.now();
      const sources = listSources().filter((s) => s.enabled);
      const dueSources = sources.filter((s) => {
        if (!s.lastFetchedAt) return true; // never fetched
        const elapsed = now - new Date(s.lastFetchedAt).getTime();
        return elapsed >= s.refreshIntervalMinutes * 60 * 1000;
      });

      if (dueSources.length === 0) return;

      this.activeTasks = dueSources.length;
      this.lastRunAt = new Date().toISOString();
      this.nextRunAt = new Date(Date.now() + 60000).toISOString();

      console.log(
        `[scheduler] Refreshing ${dueSources.length} sources (${sources.length} total, ${this.semaphore.active} active fetches)`
      );

      const allResults: Awaited<ReturnType<typeof fetchFeed>>[] = [];

      // Process sources with concurrency limit
      const fetchPromises = dueSources.map(async (src) => {
        await this.semaphore.acquire();
        try {
          const result = await fetchFeed(src);
          recordFetch(src.id, result.items.length, result.ok ? undefined : result.error);
          allResults.push(result);
        } finally {
          this.semaphore.release();
        }
      });

      await Promise.allSettled(fetchPromises);

      // Aggregate & dedup
      const allItems = allResults
        .filter((r) => r.ok)
        .flatMap((r) => r.items);

      const dedupResult = dedup(allItems, this.fingerprintCache);

      // Write cache
      const entry: FeedCacheEntry = {
        updatedAt: new Date().toISOString(),
        items: dedupResult.unique,
        totalUnique: dedupResult.stats.outputCount,
        totalRaw: dedupResult.stats.inputCount,
        dedupRate: dedupResult.stats.dedupRate,
        stats: dedupResult.stats,
        sourceCount: dueSources.length,
      };

      writeFeedCache(entry);

      const healthy = sources.filter((s) => s.consecutiveFailures === 0).length;
      console.log(
        `[scheduler] Done. ${dedupResult.stats.inputCount} raw → ${dedupResult.stats.outputCount} unique (${(dedupResult.stats.dedupRate * 100).toFixed(1)}% dedup rate). Healthy sources: ${healthy}/${sources.length}`
      );

      this.activeTasks = 0;
    });

    this.nextRunAt = new Date(Date.now() + 60000).toISOString();
    console.log(`[scheduler] Started. Checking sources every minute.`);
  }

  /** Stop the scheduler */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.running = false;
    console.log('[scheduler] Stopped.');
  }

  /** Get current scheduler status */
  getStatus(): SchedulerStatus {
    const sources = listSources();
    const enabledSources = sources.filter((s) => s.enabled).length;
    const healthySources = sources.filter((s) => s.enabled && s.consecutiveFailures === 0).length;

    return {
      running: this.running,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      taskCount: this.activeTasks,
      activeTasks: this.semaphore.active,
      totalSources: sources.length,
      enabledSources,
      healthySources,
    };
  }
}

/** Singleton scheduler instance */
let _scheduler: FeedScheduler | null = null;

export function getScheduler(): FeedScheduler {
  if (!_scheduler) {
    _scheduler = new FeedScheduler();
  }
  return _scheduler;
}
