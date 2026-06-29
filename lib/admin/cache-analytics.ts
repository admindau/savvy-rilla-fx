import { cacheManager } from "@/lib/cache";

export type CacheHealthStatus = "healthy" | "watch" | "attention";

export type CacheAnalytics = {
  generatedAt: string;
  health: {
    status: CacheHealthStatus;
    label: string;
    summary: string;
  };
  summary: {
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
    estimatedMemoryLabel: string;
    oldestEntryAt: string | null;
    newestEntryAt: string | null;
  };
  diagnostics: {
    cacheWorking: boolean;
    ttlValid: boolean;
    memoryHealthy: boolean;
    coalescingActive: boolean;
    hasEntries: boolean;
  };
  keys: {
    total: number;
    byNamespace: Array<{
      namespace: string;
      count: number;
    }>;
    recent: string[];
  };
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getNamespace(key: string) {
  const firstPart = key.split(":")[0]?.trim();
  return firstPart || "unknown";
}

function getHealthStatus(input: {
  hitRate: number;
  entries: number;
  estimatedBytes: number;
  pendingRequests: number;
}): CacheAnalytics["health"] {
  if (input.pendingRequests > 25 || input.estimatedBytes > 25 * 1024 * 1024) {
    return {
      status: "attention",
      label: "Attention",
      summary: "Cache activity is elevated. Review pending requests and memory usage.",
    };
  }

  if (input.entries > 0 && input.hitRate < 30) {
    return {
      status: "watch",
      label: "Watch",
      summary: "Cache is active, but the hit ratio is still warming up.",
    };
  }

  return {
    status: "healthy",
    label: "Healthy",
    summary: "Cache layer is operating normally.",
  };
}

export function getCacheAnalytics(): CacheAnalytics {
  const snapshot = cacheManager.snapshot();
  const keys = cacheManager.keys();

  const namespaceMap = new Map<string, number>();
  for (const key of keys) {
    const namespace = getNamespace(key);
    namespaceMap.set(namespace, (namespaceMap.get(namespace) ?? 0) + 1);
  }

  const byNamespace = Array.from(namespaceMap.entries())
    .map(([namespace, count]) => ({ namespace, count }))
    .sort((a, b) => b.count - a.count || a.namespace.localeCompare(b.namespace));

  const health = getHealthStatus({
    hitRate: snapshot.hitRate,
    entries: snapshot.entries,
    estimatedBytes: snapshot.estimatedBytes,
    pendingRequests: snapshot.pendingRequests,
  });

  return {
    generatedAt: new Date().toISOString(),
    health,
    summary: {
      hits: snapshot.hits,
      misses: snapshot.misses,
      sets: snapshot.sets,
      deletes: snapshot.deletes,
      expirations: snapshot.expirations,
      clears: snapshot.clears,
      entries: snapshot.entries,
      pendingRequests: snapshot.pendingRequests,
      hitRate: snapshot.hitRate,
      estimatedBytes: snapshot.estimatedBytes,
      estimatedMemoryLabel: formatBytes(snapshot.estimatedBytes),
      oldestEntryAt: snapshot.oldestEntryAt,
      newestEntryAt: snapshot.newestEntryAt,
    },
    diagnostics: {
      cacheWorking: true,
      ttlValid: snapshot.expirations >= 0,
      memoryHealthy: snapshot.estimatedBytes < 25 * 1024 * 1024,
      coalescingActive: snapshot.pendingRequests >= 0,
      hasEntries: snapshot.entries > 0,
    },
    keys: {
      total: keys.length,
      byNamespace,
      recent: keys.slice(0, 20),
    },
  };
}

export function clearCache() {
  cacheManager.clear();
  return getCacheAnalytics();
}

export function clearCacheByTag(tag: string) {
  const cleared = cacheManager.invalidateByTag(tag);
  return {
    cleared,
    analytics: getCacheAnalytics(),
  };
}
