import { CacheMetrics, type CacheMetricsSnapshot } from "./cache-metrics";

export type CacheEntry<T> = {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  ttlMs: number;
  tags: string[];
  estimatedBytes: number;
};

export type CacheSetOptions = {
  ttlMs: number;
  tags?: string[];
};

export type CacheGetResult<T> = {
  value: T | null;
  hit: boolean;
  ageMs: number;
  expiresAt: number | null;
};

function estimateBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly metrics = new CacheMetrics();

  get<T>(key: string): CacheGetResult<T> {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry) {
      this.metrics.record("miss");
      return { value: null, hit: false, ageMs: 0, expiresAt: null };
    }

    if (entry.expiresAt <= now) {
      this.store.delete(key);
      this.metrics.record("expired");
      this.metrics.record("miss");
      return { value: null, hit: false, ageMs: 0, expiresAt: null };
    }

    this.metrics.record("hit");

    return {
      value: entry.value as T,
      hit: true,
      ageMs: now - entry.createdAt,
      expiresAt: entry.expiresAt,
    };
  }

  set<T>(key: string, value: T, options: CacheSetOptions): CacheEntry<T> {
    const ttlMs = Math.max(0, options.ttlMs);
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttlMs,
      ttlMs,
      tags: options.tags ?? [],
      estimatedBytes: estimateBytes(value),
    };

    this.store.set(key, entry);
    this.metrics.record("set");

    return entry;
  }

  delete(key: string): boolean {
    const deleted = this.store.delete(key);
    if (deleted) this.metrics.record("delete");
    return deleted;
  }

  clear(): void {
    this.store.clear();
    this.pending.clear();
    this.metrics.record("clear");
  }

  invalidateByTag(tag: string): number {
    let deletedCount = 0;

    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
        deletedCount += 1;
      }
    }

    if (deletedCount > 0) this.metrics.record("delete");
    return deletedCount;
  }

  async remember<T>(key: string, options: CacheSetOptions, loader: () => Promise<T>): Promise<CacheGetResult<T>> {
    const cached = this.get<T>(key);
    if (cached.hit) return cached;

    const existingPending = this.pending.get(key) as Promise<T> | undefined;
    if (existingPending) {
      const value = await existingPending;
      return this.get<T>(key).hit
        ? this.get<T>(key)
        : { value, hit: false, ageMs: 0, expiresAt: null };
    }

    const pending = loader();
    this.pending.set(key, pending);

    try {
      const value = await pending;
      const entry = this.set(key, value, options);
      return {
        value,
        hit: false,
        ageMs: 0,
        expiresAt: entry.expiresAt,
      };
    } finally {
      this.pending.delete(key);
    }
  }

  keys(): string[] {
    this.pruneExpired();
    return Array.from(this.store.keys()).sort();
  }

  snapshot(): CacheMetricsSnapshot {
    this.pruneExpired();

    const entries = Array.from(this.store.values());
    const oldest = entries.reduce<number | null>(
      (current, entry) => (current === null || entry.createdAt < current ? entry.createdAt : current),
      null,
    );
    const newest = entries.reduce<number | null>(
      (current, entry) => (current === null || entry.createdAt > current ? entry.createdAt : current),
      null,
    );
    const estimatedBytes = entries.reduce((total, entry) => total + entry.estimatedBytes, 0);

    return this.metrics.snapshot({
      entries: entries.length,
      pendingRequests: this.pending.size,
      estimatedBytes,
      oldestEntryAt: oldest === null ? null : new Date(oldest).toISOString(),
      newestEntryAt: newest === null ? null : new Date(newest).toISOString(),
    });
  }

  private pruneExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
        this.metrics.record("expired");
      }
    }
  }
}
