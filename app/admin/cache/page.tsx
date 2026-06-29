"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CacheHealthStatus = "healthy" | "watch" | "attention";

type CacheAnalytics = {
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

type CacheResponse = {
  analytics: CacheAnalytics;
  message?: string;
};

const numberFormat = new Intl.NumberFormat("en");
const percentFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatPercent(value: number) {
  return `${percentFormat.format(value)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function healthClass(status: CacheHealthStatus) {
  if (status === "attention") return "border-red-400/30 bg-red-400/10 text-red-100";
  if (status === "watch") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100";
}

function barWidth(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${Math.max(4, Math.round((value / max) * 100))}%`;
}

export default function AdminCachePage() {
  const [analytics, setAnalytics] = useState<CacheAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCacheAnalytics = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/cache", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load cache analytics.");
      }

      const payload = (await response.json()) as CacheResponse;
      setAnalytics(payload.analytics);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load cache analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async (tag?: string) => {
    setClearing(tag ?? "all");
    setMessage(null);

    try {
      const url = tag ? `/api/admin/cache?tag=${encodeURIComponent(tag)}` : "/api/admin/cache";
      const response = await fetch(url, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear cache.");
      }

      const payload = (await response.json()) as CacheResponse;
      setAnalytics(payload.analytics);
      setMessage(payload.message ?? "Cache cleared.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to clear cache.");
    } finally {
      setClearing(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCacheAnalytics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCacheAnalytics]);

  const totalReads = useMemo(() => {
    if (!analytics) return 0;
    return analytics.summary.hits + analytics.summary.misses;
  }, [analytics]);

  const maxNamespaceCount = useMemo(() => {
    if (!analytics) return 1;
    return Math.max(...analytics.keys.byNamespace.map((item) => item.count), 1);
  }, [analytics]);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Savvy Rilla FX Admin
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Cache Dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm text-white/60">
                Monitor the in-memory API cache, validate hit ratios, and clear cached FX data
                during operational updates.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/api-usage"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                API usage
              </Link>
              <button
                type="button"
                onClick={() => void loadCacheAnalytics()}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        {message ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/70">
            {message}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/60">
            Loading cache analytics...
          </section>
        ) : analytics ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Cache health"
                value={analytics.health.label}
                helper={analytics.health.summary}
                className={healthClass(analytics.health.status)}
              />
              <MetricCard
                label="Hit ratio"
                value={formatPercent(analytics.summary.hitRate)}
                helper={`${formatNumber(analytics.summary.hits)} hits / ${formatNumber(totalReads)} reads`}
              />
              <MetricCard
                label="Entries"
                value={formatNumber(analytics.summary.entries)}
                helper={`${analytics.summary.estimatedMemoryLabel} estimated memory`}
              />
              <MetricCard
                label="Pending requests"
                value={formatNumber(analytics.summary.pendingRequests)}
                helper="Coalesced requests currently in flight"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 lg:col-span-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Cache activity</h2>
                    <p className="mt-1 text-sm text-white/50">
                      Operational counters since the current server process started.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                    Updated {formatDateTime(analytics.generatedAt)}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <SmallStat label="Hits" value={formatNumber(analytics.summary.hits)} />
                  <SmallStat label="Misses" value={formatNumber(analytics.summary.misses)} />
                  <SmallStat label="Sets" value={formatNumber(analytics.summary.sets)} />
                  <SmallStat label="Deletes" value={formatNumber(analytics.summary.deletes)} />
                  <SmallStat label="Expirations" value={formatNumber(analytics.summary.expirations)} />
                  <SmallStat label="Clears" value={formatNumber(analytics.summary.clears)} />
                </div>

                <div className="mt-6 space-y-4">
                  {analytics.keys.byNamespace.length > 0 ? (
                    analytics.keys.byNamespace.map((item) => (
                      <div key={item.namespace} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-white">{item.namespace}</span>
                          <span className="text-white/50">{formatNumber(item.count)} entries</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-white/70"
                            style={{ width: barWidth(item.count, maxNamespaceCount) }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/50">
                      No cache entries yet. Visit public API endpoints to warm the cache.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold">Operations</h2>
                <p className="mt-1 text-sm text-white/50">
                  Clear cache entries after manual rate updates or operational incidents.
                </p>

                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => void clearCache()}
                    disabled={clearing !== null}
                    className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {clearing === "all" ? "Clearing..." : "Clear all cache"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearCache("rates")}
                    disabled={clearing !== null}
                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {clearing === "rates" ? "Clearing..." : "Clear rates cache"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearCache("summary")}
                    disabled={clearing !== null}
                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {clearing === "summary" ? "Clearing..." : "Clear summary cache"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void clearCache("currencies")}
                    disabled={clearing !== null}
                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {clearing === "currencies" ? "Clearing..." : "Clear currencies cache"}
                  </button>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/50">
                  Cache is process-local in this release. A future Redis-backed cache will allow
                  shared cache state across multiple serverless instances.
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold">Diagnostics</h2>
                <div className="mt-5 space-y-3">
                  <HealthRow label="Cache working" ok={analytics.diagnostics.cacheWorking} />
                  <HealthRow label="TTL valid" ok={analytics.diagnostics.ttlValid} />
                  <HealthRow label="Memory healthy" ok={analytics.diagnostics.memoryHealthy} />
                  <HealthRow label="Coalescing active" ok={analytics.diagnostics.coalescingActive} />
                  <HealthRow label="Entries warmed" ok={analytics.diagnostics.hasEntries} />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold">Cache timeline</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <SmallStat label="Oldest entry" value={formatDateTime(analytics.summary.oldestEntryAt)} />
                  <SmallStat label="Newest entry" value={formatDateTime(analytics.summary.newestEntryAt)} />
                  <SmallStat label="Stored keys" value={formatNumber(analytics.keys.total)} />
                  <SmallStat label="Memory" value={analytics.summary.estimatedMemoryLabel} />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Recent cache keys</h2>
              <div className="mt-5 space-y-2">
                {analytics.keys.recent.length > 0 ? (
                  analytics.keys.recent.map((key) => (
                    <code
                      key={key}
                      className="block overflow-x-auto rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white/60"
                    >
                      {key}
                    </code>
                  ))
                ) : (
                  <p className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/50">
                    No cache keys are currently stored.
                  </p>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-8 text-sm text-red-100">
            Cache analytics could not be loaded.
          </section>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  helper,
  className,
}: {
  label: string;
  value: string;
  helper: string;
  className?: string;
}) {
  return (
    <article className={`rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 ${className ?? ""}`}>
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">{label}</p>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-white/50">{helper}</p>
    </article>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-white/35">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <span className="text-sm text-white/70">{label}</span>
      <span
        className={`rounded-full border px-3 py-1 text-xs ${
          ok
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
            : "border-amber-400/30 bg-amber-400/10 text-amber-100"
        }`}
      >
        {ok ? "OK" : "Watch"}
      </span>
    </div>
  );
}
