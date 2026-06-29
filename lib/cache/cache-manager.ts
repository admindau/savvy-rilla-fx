import { MemoryCache, type CacheGetResult, type CacheSetOptions } from "./memory-cache";
import type { CacheMetricsSnapshot } from "./cache-metrics";

export type CacheManager = {
  get<T>(key: string): CacheGetResult<T>;
  set<T>(key: string, value: T, options: CacheSetOptions): void;
  remember<T>(key: string, options: CacheSetOptions, loader: () => Promise<T>): Promise<CacheGetResult<T>>;
  delete(key: string): boolean;
  clear(): void;
  invalidateByTag(tag: string): number;
  keys(): string[];
  snapshot(): CacheMetricsSnapshot;
};

const globalCacheKey = Symbol.for("savvy-rilla-fx-api.memory-cache");

type GlobalWithCache = typeof globalThis & {
  [globalCacheKey]?: MemoryCache;
};

function getGlobalCache(): MemoryCache {
  const globalStore = globalThis as GlobalWithCache;

  if (!globalStore[globalCacheKey]) {
    globalStore[globalCacheKey] = new MemoryCache();
  }

  return globalStore[globalCacheKey];
}

export const cacheManager: CacheManager = getGlobalCache();
