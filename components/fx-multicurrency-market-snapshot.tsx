"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

type FxChartPoint = { date: string; mid: number };

type HistoryResponse = {
  pair: string;
  base: string;
  quote: string;
  points: FxChartPoint[];
  meta: { from: string; to: string; count: number };
};

type MarketSummary = {
  base: string;
  quote: string;
  as_of_date: string;
  mid_rate: number;
  change_pct_vs_previous: number | null;
  range: {
    window_days: number;
    high: number;
    low: number;
  };
  trend: {
    window_days: number;
    label: "Range-Bound" | "Uptrend" | "Downtrend" | string;
  };
  volatility: {
    window_days: number;
    avg_daily_move_pct: number | null;
  };
};

type RangeKey = "30d" | "90d" | "365d" | "all";
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "365d", label: "365d" },
  { key: "all", label: "All" },
];

const RANGE_DAYS: Record<RangeKey, number | null> = {
  "30d": 30,
  "90d": 90,
  "365d": 365,
  all: null,
};

const CURRENCIES = ["USD", "EUR", "KES", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];

const CURRENCY_COLORS: Record<Currency, string> = {
  USD: "#ffffff",
  EUR: "#cfcfcf",
  KES: "#9a9a9a",
  GBP: "#7a7a7a",
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json().catch(() => null);

    if (!res.ok || (json as any)?.error) {
      console.error("FX fetch error:", url, res.status, (json as any)?.error || json);
      return null;
    }
    return json as T;
  } catch (err) {
    console.error("FX fetch failed:", url, err);
    return null;
  }
}

function format4(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function FxMultiCurrencyMarketSnapshot() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");
  const [activeCurrencies, setActiveCurrencies] = useState<Currency[]>(["USD"]);
  const [range, setRange] = useState<RangeKey>("90d");

  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Cache history by (range -> currency -> points)
  const [historyCache, setHistoryCache] = useState<
    Partial<Record<RangeKey, Partial<Record<Currency, FxChartPoint[]>>>>
  >({});

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [zoomReady, setZoomReady] = useState(false);
  const chartRef = useRef<any>(null);

  // Load zoom plugin once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const mod = await import("chartjs-plugin-zoom");
        if (cancelled) return;
        ChartJS.register(mod.default);
        setZoomReady(true);
      } catch (e) {
        console.warn("chartjs-plugin-zoom failed to load:", e);
        // Still render chart without zoom
        setZoomReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCurrency(cur: Currency) {
    setSelectedCurrency(cur);
    setActiveCurrencies((prev) => {
      if (prev.includes(cur)) {
        if (prev.length === 1) return prev; // keep at least one visible
        return prev.filter((c) => c !== cur);
      }
      return [...prev, cur];
    });
  }

  // Summary for stats (Range/Trend/Volatility + headline)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setSummaryLoading(true);
      setSummaryError(null);

      const s = await fetchJson<MarketSummary>(
        `/api/v1/summary/market?base=SSP&quote=${encodeURIComponent(selectedCurrency)}`
      );

      if (cancelled) return;

      if (!s) {
        setSummary(null);
        setSummaryError("Failed to load market summary.");
        setSummaryLoading(false);
        return;
      }

      setSummary(s);
      setSummaryLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCurrency]);

  // History for active currencies at current range
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      const existingForRange = historyCache[range] ?? {};
      const missing = activeCurrencies.filter((c) => !existingForRange?.[c]);

      if (missing.length === 0) {
        setHistoryLoading(false);
        return;
      }

      const days = RANGE_DAYS[range];

      const results = await Promise.all(
        missing.map(async (cur) => {
          const url =
            days == null
              ? `/api/v1/rates/history?base=SSP&quote=${encodeURIComponent(cur)}`
              : `/api/v1/rates/history?base=SSP&quote=${encodeURIComponent(cur)}&days=${days}`;

          const h = await fetchJson<HistoryResponse>(url);
          return { cur, points: h?.points ?? [] };
        })
      );

      if (cancelled) return;

      setHistoryCache((prev) => {
        const next = { ...prev };
        const forRange = { ...(next[range] ?? {}) } as Partial<Record<Currency, FxChartPoint[]>>;
        for (const r of results) {
          forRange[r.cur] = r.points;
        }
        next[range] = forRange;
        return next;
      });

      // If everything is empty, surface a gentle error
      const anyPoints = results.some((r) => (r.points?.length ?? 0) > 1);
      if (!anyPoints) {
        setHistoryError("Not enough data yet to display trends for this window.");
      }

      setHistoryLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, activeCurrencies]);

  const filteredSeries = useMemo(() => {
    const forRange = historyCache[range] ?? {};
    const out: Partial<Record<Currency, FxChartPoint[]>> = {};
    for (const cur of activeCurrencies) {
      const pts = forRange[cur] ?? [];
      if (pts.length > 0) out[cur] = pts;
    }
    return out;
  }, [historyCache, range, activeCurrencies]);

  const labels = useMemo(() => {
    const set = new Set<string>();
    for (const cur of activeCurrencies) {
      const pts = filteredSeries[cur];
      if (!pts) continue;
      for (const p of pts) set.add(p.date);
    }
    return Array.from(set).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [filteredSeries, activeCurrencies]);

  const datasets = useMemo(() => {
    return activeCurrencies
      .filter((cur) => (filteredSeries[cur]?.length ?? 0) > 0)
      .map((cur) => {
        const pts = filteredSeries[cur] ?? [];
        const values = labels.map((d) => {
          const match = pts.find((p) => p.date === d);
          return match ? match.mid : null;
        });

        const isSelected = cur === selectedCurrency;
        const color = CURRENCY_COLORS[cur];

        return {
          label: `${cur}/SSP mid rate`,
          data: values,
          borderColor: color,
          backgroundColor: isSelected ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)",
          pointRadius: isSelected ? 3 : 1.6,
          pointHoverRadius: isSelected ? 5 : 3,
          pointBackgroundColor: color,
          tension: 0.25,
          fill: false,
          borderWidth: isSelected ? 2.4 : 1.2,
          borderDash: isSelected ? [] : [4, 3],
        };
      });
  }, [activeCurrencies, filteredSeries, labels, selectedCurrency]);

  const data = useMemo(() => ({ labels, datasets }), [labels, datasets]);

  const options: any = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "rgba(255,255,255,0.75)",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 5,
          },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
        y: {
          ticks: { color: "rgba(255,255,255,0.75)" },
          grid: { color: "rgba(255,255,255,0.08)" },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: "rgba(255,255,255,0.85)", font: { size: 10 } },
        },
        tooltip: {
          mode: "index" as const,
          intersect: false,
          backgroundColor: "rgba(0,0,0,0.92)",
          borderColor: "rgba(255,255,255,0.2)",
          borderWidth: 1,
          titleColor: "#ffffff",
          bodyColor: "#f5f5f5",
          callbacks: {
            label: (ctx: any) => {
              const v = ctx.parsed?.y;
              if (typeof v === "number") return ` ${format4(v)} SSP`;
              return ` ${v ?? "—"} SSP`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            drag: { enabled: true },
            mode: "x",
          },
          pan: {
            enabled: true,
            mode: "x",
            modifierKey: "shift",
          },
          limits: { x: { minRange: 7 } },
        },
      },
    }),
    []
  );

  function handleResetZoom() {
    const chart = (chartRef.current as any)?.chart || chartRef.current;
    if (chart && typeof chart.resetZoom === "function") chart.resetZoom();
  }

  // Keyboard shortcut: R to reset zoom
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        const editable = (t as any).isContentEditable;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable) return;
      }

      if (
        (e.key === "r" || e.key === "R") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        handleResetZoom();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const headline = useMemo(() => {
    if (!summary) return null;

    const mid = summary.mid_rate;
    const change = summary.change_pct_vs_previous;

    if (mid == null) return null;

    if (change == null || Number.isNaN(change)) {
      return `Latest ${summary.quote}/SSP mid rate is ${format4(mid)}.`;
    }

    const dirWord = Math.abs(change) < 0.01 ? "unchanged" : change > 0 ? "up" : "down";
    const changePart = Math.abs(change) < 0.01 ? "" : `, ${dirWord} ${Math.abs(change).toFixed(2)}%`;
    return `Latest ${summary.quote}/SSP mid rate is ${format4(mid)}${changePart} compared to the previous fixing.`;
  }, [summary]);

  const stats = useMemo(() => {
    if (!summary) return null;

    const rangeHigh = summary.range?.high ?? null;
    const rangeLow = summary.range?.low ?? null;
    const rangeWindow = summary.range?.window_days ?? 7;

    const trendLabel = summary.trend?.label ?? "Range-Bound";
    const trendWindow = summary.trend?.window_days ?? 3;

    const vol = summary.volatility?.avg_daily_move_pct ?? null;
    const volWindow = summary.volatility?.window_days ?? 30;

    return {
      rangeHigh,
      rangeLow,
      rangeWindow,
      trendLabel,
      trendWindow,
      vol,
      volWindow,
      asOf: summary.as_of_date,
      quote: summary.quote,
    };
  }, [summary]);

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">
          Market snapshot
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {CURRENCIES.map((cur) => {
              const isSelected = selectedCurrency === cur;
              const isActive = activeCurrencies.includes(cur);
              return (
                <button
                  key={cur}
                  type="button"
                  onClick={() => toggleCurrency(cur)}
                  className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                    isActive
                      ? isSelected
                        ? "bg-white text-black border-white"
                        : "bg-black text-white border-white"
                      : "bg-black text-white/40 border-white/20 hover:border-white/40"
                  }`}
                  aria-pressed={isActive}
                >
                  {cur}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                  range === opt.key
                    ? "bg-white text-black border-white"
                    : "bg-black text-white/70 border-white/30 hover:border-white/70"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2">
        {summaryLoading ? (
          <p className="text-[11px] text-white/60">Loading market summary…</p>
        ) : summaryError ? (
          <p className="text-[11px] text-red-300">{summaryError}</p>
        ) : headline ? (
          <p className="text-[11px] text-white/80">{headline}</p>
        ) : (
          <p className="text-[11px] text-white/60">No summary data yet.</p>
        )}
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3 text-[11px]">
          <div className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5">
            <p className="text-white/60 mb-0.5">Range high / low</p>
            {stats.rangeHigh != null && stats.rangeLow != null ? (
              <>
                <p className="font-mono">
                  {format4(stats.rangeHigh)} / {format4(stats.rangeLow)}
                </p>
                <p className="text-[10px] text-white/50">
                  {stats.rangeWindow}-day window · as of {stats.asOf}
                </p>
              </>
            ) : (
              <p className="text-white/55">—</p>
            )}
          </div>

          <div className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5">
            <p className="text-white/60 mb-0.5">Trend</p>
            <p className="font-mono">{stats.trendLabel}</p>
            <p className="text-[10px] text-white/50">
              {stats.trendWindow}-day signal
            </p>
          </div>

          <div className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5">
            <p className="text-white/60 mb-0.5">Volatility</p>
            {stats.vol != null ? (
              <>
                <p className="font-mono">{stats.vol.toFixed(2)}% avg daily move</p>
                <p className="text-[10px] text-white/50">
                  Based on absolute day-to-day changes · {stats.volWindow}-day window
                </p>
              </>
            ) : (
              <p className="text-white/55">—</p>
            )}
          </div>
        </div>
      )}

      {/* Instructions row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/55">
        <span>
          Scroll / pinch to zoom · <span className="font-semibold">Shift + drag</span> to pan
        </span>
        <span className="flex items-center gap-1">
          Press{" "}
          <span className="inline-flex items-center justify-center rounded border border-white/40 px-1 py-0.5 font-mono text-[9px]">
            R
          </span>{" "}
          to reset zoom
        </span>
      </div>

      {/* Chart */}
      <div className="mt-2 h-40 sm:h-44 md:h-48">
        {historyLoading && labels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-white/60">
            Loading chart…
          </div>
        ) : historyError && labels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-white/60">
            {historyError}
          </div>
        ) : labels.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] text-white/60">
            Not enough data yet to display trends.
          </div>
        ) : zoomReady ? (
          <Line ref={chartRef} data={data} options={options} />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-white/60">
            Loading chart…
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleResetZoom}
          className="px-3 py-1 text-[10px] rounded-full border border-white/30 text-white/70 hover:bg-white hover:text-black transition-colors"
        >
          Reset zoom
        </button>
      </div>
    </div>
  );
}
