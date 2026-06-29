export type CacheEvent = "hit" | "miss" | "set" | "delete" | "expired" | "clear";

export type CacheMetricsSnapshot = {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  expirations: number;
  clears: number;
  entries: number;
  pendingRequests: number;
  hitRate: number;
  estimatedBytes: number;
  oldestEntryAt: string | null;
  newestEntryAt: string | null;
};

export class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private expirations = 0;
  private clears = 0;

  record(event: CacheEvent): void {
    if (event === "hit") this.hits += 1;
    if (event === "miss") this.misses += 1;
    if (event === "set") this.sets += 1;
    if (event === "delete") this.deletes += 1;
    if (event === "expired") this.expirations += 1;
    if (event === "clear") this.clears += 1;
  }

  snapshot(input: {
    entries: number;
    pendingRequests: number;
    estimatedBytes: number;
    oldestEntryAt: string | null;
    newestEntryAt: string | null;
  }): CacheMetricsSnapshot {
    const totalReads = this.hits + this.misses;

    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      expirations: this.expirations,
      clears: this.clears,
      entries: input.entries,
      pendingRequests: input.pendingRequests,
      hitRate: totalReads === 0 ? 0 : Number(((this.hits / totalReads) * 100).toFixed(2)),
      estimatedBytes: input.estimatedBytes,
      oldestEntryAt: input.oldestEntryAt,
      newestEntryAt: input.newestEntryAt,
    };
  }
}
