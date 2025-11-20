"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend
);

type SaveState = "idle" | "saving" | "success" | "error";

type FxRate = {
  id?: number;
  asOfDate: string;
  baseCurrency?: string;
  quoteCurrency: string;
  rateMid: number;
  isOfficial: boolean;
  isManualOverride?: boolean;
  created_at?: string;
};

type FxChartPoint = {
  date: string;
  rateMid: number;
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

const CURRENCY_OPTIONS = ["USD", "EUR", "KES", "GBP"];

const CURRENCY_COLORS: Record<string, string> = {
  USD: "#ffffff",
  EUR: "#cccccc",
  KES: "#999999",
  GBP: "#777777",
};

/**
 * FX TREND CHART + SMART INSIGHTS
 * Lives on the LEFT under the Save FX rate button.
 */
function FxTrendChart() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>(["USD"]);
  const [range, setRange] = useState<RangeKey>("90d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [series, setSeries] = useState<Record<string, FxChartPoint[]>>({});

  function toggleCurrency(cur: string) {
    setSelectedCurrency(cur);
    setActiveCurrencies((prev) => {
      if (prev.includes(cur)) {
        if (prev.length === 1) return prev; // never allow zero
        return prev.filter((c) => c !== cur);
      }
      return [...prev, cur];
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        setLoading(true);
        setError(null);

        const nextSeries: Record<string, FxChartPoint[]> = {};

        for (const cur of CURRENCY_OPTIONS) {
          try {
            const res = await fetch(
              `/api/admin/chart-data?quote=${encodeURIComponent(cur)}&limit=365`
            );
            const json = await res.json();

            if (!res.ok || json?.error) {
              console.error(
                `Error loading FX chart data for ${cur}:`,
                json?.error || json?.message
              );
              nextSeries[cur] = [];
            } else {
              nextSeries[cur] = json.points ?? [];
            }
          } catch (err: any) {
            console.error(
              `Unexpected error loading FX chart data for ${cur}:`,
              err
            );
            nextSeries[cur] = [];
          }
        }

        if (!cancelled) {
          setSeries(nextSeries);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message || "Unexpected error while loading FX chart data."
          );
          setSeries({});
          setLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  function applyRangeFilter(points: FxChartPoint[]): FxChartPoint[] {
    if (!points.length) return [];
    const days = RANGE_DAYS[range];
    if (days == null || points.length <= days) {
      return points;
    }
    return points.slice(points.length - days);
  }

  const filteredSeries: Record<string, FxChartPoint[]> = {};
  CURRENCY_OPTIONS.forEach((cur) => {
    const pts = series[cur];
    if (pts && pts.length) {
      const filtered = applyRangeFilter(pts);
      if (filtered.length) {
        filteredSeries[cur] = filtered;
      }
    }
  });

  const dateSet = new Set<string>();
  activeCurrencies.forEach((cur) => {
    const pts = filteredSeries[cur];
    if (pts) {
      pts.forEach((p) => dateSet.add(p.date));
    }
  });

  const labels = Array.from(dateSet).sort();

  const insights = (() => {
    const pts = filteredSeries[selectedCurrency];
    if (!pts || pts.length < 2) return null;

    const latest = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    if (!latest || !prev || prev.rateMid === 0) return null;

    const diff = latest.rateMid - prev.rateMid;
    const pct = (diff / prev.rateMid) * 100;
    const direction =
      Math.abs(diff) < 0.0001 ? "unchanged" : diff > 0 ? "higher" : "lower";
    const signWord = diff > 0 ? "up" : diff < 0 ? "down" : "unchanged";

    let primarySummary: string;
    if (direction === "unchanged") {
      primarySummary = `Latest ${selectedCurrency}/SSP mid rate is ${latest.rateMid.toLocaleString(
        "en-US",
        { minimumFractionDigits: 4, maximumFractionDigits: 4 }
      )}, unchanged versus the previous fixing.`;
    } else {
      primarySummary = `Latest ${selectedCurrency}/SSP mid rate is ${latest.rateMid.toLocaleString(
        "en-US",
        { minimumFractionDigits: 4, maximumFractionDigits: 4 }
      )}, ${signWord} ${Math.abs(pct).toFixed(
        2
      )}% compared to the previous fixing.`;
    }

    let high = pts[0].rateMid;
    let low = pts[0].rateMid;
    let highDate = pts[0].date;
    let lowDate = pts[0].date;

    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.rateMid > high) {
        high = p.rateMid;
        highDate = p.date;
      }
      if (p.rateMid < low) {
        low = p.rateMid;
        lowDate = p.date;
      }
    }

    let daysUp = 0;
    let daysDown = 0;
    const pctMoves: number[] = [];

    for (let i = 1; i < pts.length; i++) {
      const prevPoint = pts[i - 1];
      const cur = pts[i];
      const move = cur.rateMid - prevPoint.rateMid;

      if (move > 0) daysUp++;
      else if (move < 0) daysDown++;

      if (prevPoint.rateMid !== 0) {
        const pctMove = (move / prevPoint.rateMid) * 100;
        pctMoves.push(Math.abs(pctMove));
      }
    }

    const volatilityPct =
      pctMoves.length > 0
        ? pctMoves.reduce((sum, v) => sum + v, 0) / pctMoves.length
        : 0;

    const first = pts[0];
    let trendLabel = "range-bound";
    if (first && first.rateMid !== 0) {
      const overallPct =
        ((latest.rateMid - first.rateMid) / first.rateMid) * 100;
      if (overallPct > 1) trendLabel = "upward trend";
      else if (overallPct < -1) trendLabel = "downward trend";
    }

    return {
      primarySummary,
      high,
      highDate,
      low,
      lowDate,
      daysUp,
      daysDown,
      volatilityPct,
      trendLabel,
    };
  })();

  if (loading) {
    return (
      <div className="mt-3 border border-white/10 rounded-xl px-3 py-2">
        <p className="text-[11px] text-white/60">Loading FX trends…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 border border-white/10 rounded-xl px-3 py-2">
        <p className="text-[11px] text-red-300">
          {error || "Failed to load FX chart data."}
        </p>
      </div>
    );
  }

  if (!labels.length) {
    return (
      <div className="mt-3 border border-white/10 rounded-xl px-3 py-2">
        <p className="text-[11px] text-white/60">
          Not enough data yet to display trends.
        </p>
      </div>
    );
  }

  const datasets = activeCurrencies
    .filter((cur) => filteredSeries[cur] && filteredSeries[cur].length)
    .map((cur) => {
      const pts = filteredSeries[cur];
      const values = labels.map((date) => {
        const match = pts.find((p) => p.date === date);
        return match ? match.rateMid : null;
      });

      const color = CURRENCY_COLORS[cur] || "#ffffff";

      return {
        label: `${cur}/SSP mid rate`,
        data: values,
        borderColor: color,
        backgroundColor: "rgba(255,255,255,0.08)",
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        tension: 0.25,
        fill: false,
      };
    });

  const data = { labels, datasets };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          color: "rgba(255,255,255,0.7)",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 5,
        },
        grid: {
          color: "rgba(255,255,255,0.08)",
        },
      },
      y: {
        ticks: {
          color: "rgba(255,255,255,0.7)",
        },
        grid: {
          color: "rgba(255,255,255,0.08)",
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: "rgba(255,255,255,0.8)",
          font: { size: 10 },
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        backgroundColor: "rgba(0,0,0,0.9)",
        borderColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
        titleColor: "#ffffff",
        bodyColor: "#f5f5f5",
        callbacks: {
          label: (context: any) => {
            const v = context.parsed.y;
            if (typeof v === "number") {
              return ` ${v.toLocaleString("en-US", {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })} SSP`;
            }
            return ` ${v} SSP`;
          },
        },
      },
    },
  };

  return (
    <div className="mt-4 border border-white/10 rounded-xl bg-black/40 px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">
          Market snapshot
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {CURRENCY_OPTIONS.map((cur) => {
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
                    : "bg-black text-white/40 border-white/20"
                }`}
              >
                {cur}
              </button>
            );
          })}
        </div>
      </div>

      {/* Range */}
      <div className="flex items-center justify-end gap-1">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRange(opt.key)}
            className={`px-2 py-0.5 rounded-full text-[10px] border ${
              range === opt.key
                ? "bg-white text-black border-white"
                : "bg-black text-white/70 border-white/30 hover:border-white/70"
            } transition-colors`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Insights */}
      {insights ? (
        <>
          <p className="text-[11px] text-white/80">
            {insights.primarySummary}
          </p>

          <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
            <div className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5">
              <p className="text-white/60 mb-0.5">Range high / low</p>
              <p className="font-mono">
                {insights.high.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}{" "}
                /{" "}
                {insights.low.toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </p>
              <p className="text-[10px] text-white/50">
                High {insights.highDate} · Low {insights.lowDate}
              </p>
            </div>

            <div className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5">
              <p className="text-white/60 mb-0.5">Trend</p>
              <p className="font-mono capitalize">{insights.trendLabel}</p>
              <p className="text-[10px] text-white/50">
                {insights.daysUp} up days · {insights.daysDown} down days
              </p>
            </div>

            <div className="rounded-lg border border-white/15 bg-black/50 px-2 py-1.5">
              <p className="text-white/60 mb-0.5">Volatility</p>
              <p className="font-mono">
                {insights.volatilityPct.toFixed(2)}% avg daily move
              </p>
              <p className="text-[10px] text-white/50">
                Based on absolute day-to-day changes
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-white/60">
          Not enough data for {selectedCurrency} to generate insights yet.
        </p>
      )}

      {/* Chart */}
      <div className="h-40 sm:h-44 md:h-48">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false);

  const [asOfDate, setAsOfDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [quoteCurrency, setQuoteCurrency] = useState<string>("USD");
  const [rateMid, setRateMid] = useState<string>("");
  const [isOfficial, setIsOfficial] = useState<boolean>(true);

  const [editMode, setEditMode] = useState(false);
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const [rates, setRates] = useState<FxRate[]>([]);
  const [ratesState, setRatesState] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [ratesError, setRatesError] = useState<string | null>(null);

  async function fetchRecentRates() {
    try {
      setRatesState("loading");
      setRatesError(null);
      const res = await fetch("/api/admin/recent-rates");
      const json = await res.json();
      if (!res.ok || json?.error) {
        setRatesState("error");
        setRatesError(
          json?.error || json?.message || "Failed to load recent FX rates."
        );
        setRates([]);
        return;
      }
      setRates(json?.data ?? []);
      setRatesState("idle");
    } catch (err: any) {
      setRatesState("error");
      setRatesError(
        err?.message || "Unexpected error while loading FX rates."
      );
      setRates([]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/admin/check");
        if (res.status === 401 && !cancelled) {
          window.location.href = "/admin/login";
          return;
        }
        if (!cancelled) {
          setAuthChecked(true);
          fetchRecentRates();
        }
      } catch {
        if (!cancelled) {
          window.location.href = "/admin/login";
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function resetFormToCreate() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const today = `${d.getFullYear()}-${mm}-${dd}`;

    setAsOfDate(today);
    setQuoteCurrency("USD");
    setRateMid("");
    setIsOfficial(true);

    setEditMode(false);
    setEditingRateId(null);
    setEditingLabel(null);
    setSaveState("idle");
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    setMessage(null);

    try {
      const parsedRate = Number(rateMid);
      if (!asOfDate || !quoteCurrency || !parsedRate || Number.isNaN(parsedRate)) {
        setSaveState("error");
        setMessage("Please fill in date, currency, and a valid numeric rate.");
        return;
      }

      const res = await fetch("/api/admin/manual-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asOfDate,
          quoteCurrency,
          rateMid: parsedRate,
          isOfficial,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        setSaveState("error");
        setMessage(json?.error || json?.message || "Failed to save FX rate.");
        return;
      }

      setSaveState("success");
      setMessage(
        editMode
          ? json?.message || "FX rate updated successfully."
          : json?.message || "FX rate saved successfully."
      );

      setEditMode(false);
      setEditingRateId(null);
      setEditingLabel(null);

      fetchRecentRates();
    } catch (err: any) {
      setSaveState("error");
      setMessage(
        err?.message
          ? `Unexpected error: ${err.message}`
          : "Unexpected error while saving FX rate."
      );
    }
  }

  function handleEdit(rate: FxRate) {
    setEditMode(true);
    setEditingRateId(rate.id ?? null);

    if (rate.asOfDate) setAsOfDate(rate.asOfDate);
    if (rate.quoteCurrency) setQuoteCurrency(rate.quoteCurrency.toUpperCase());
    if (typeof rate.rateMid === "number") {
      setRateMid(rate.rateMid.toString());
    } else {
      setRateMid(String(rate.rateMid ?? ""));
    }
    setIsOfficial(Boolean(rate.isOfficial));

    const label = `${rate.quoteCurrency} on ${rate.asOfDate}`;
    setEditingLabel(label);
    setSaveState("idle");
    setMessage(null);
  }

  async function handleDelete(id?: number) {
    if (!id) return;
    const confirmed = window.confirm("Delete this FX rate? This cannot be undone.");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/delete-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        alert(json?.error || json?.message || "Failed to delete FX rate.");
        return;
      }

      if (editingRateId === id) {
        resetFormToCreate();
      }

      fetchRecentRates();
    } catch (err: any) {
      alert(err?.message || "Unexpected error while deleting FX rate.");
    }
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-white/70">Checking admin access…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-4">
      <div className="w-full max-w-5xl border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl bg-white/5 max-h-[90vh] flex flex-col overflow-hidden">
        <header className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-center">
            Savvy Rilla FX – Admin
          </h1>
          <p className="mt-1 text-sm text-center text-white/70">
            Manual mid-rate entry for SSP vs global currencies.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2 flex-1 min-h-0">
          {/* LEFT – FORM + CHART */}
          <section className="flex flex-col overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-4">
              {editMode && editingLabel && (
                <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex items-center justify-between gap-2">
                  <span>
                    Editing rate for{" "}
                    <span className="font-semibold">{editingLabel}</span>
                  </span>
                  <button
                    type="button"
                    onClick={resetFormToCreate}
                    className="text-[11px] underline decoration-dotted underline-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium">As of date</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm outline-none focus:border-white focus:ring-1 focus:ring-white"
                  required
                />
                <p className="text-xs text-white/60">
                  Trading date the rate applies to.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium">
                  Quote currency
                </label>
                <input
                  type="text"
                  value={quoteCurrency}
                  onChange={(e) =>
                    setQuoteCurrency(e.target.value.toUpperCase())
                  }
                  className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm uppercase tracking-wide outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="USD"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-white/60">
                  Example: <span className="font-mono">USD</span>,{" "}
                  <span className="font-mono">EUR</span>,{" "}
                  <span className="font-mono">KES</span>. Base is assumed to be
                  SSP.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium">Mid rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={rateMid}
                  onChange={(e) => setRateMid(e.target.value)}
                  className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="1500.0000"
                  required
                />
                <p className="text-xs text-white/60">
                  SSP per {quoteCurrency || "quote currency"} (mid rate).
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 border border-white/10 rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    Mark as official rate
                  </p>
                  <p className="text-xs text-white/60">
                    If checked, this rate can be used as the official BoSS FX
                    reference.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOfficial((prev) => !prev)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors ${
                    isOfficial ? "bg-white" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition-transform ${
                      isOfficial ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {message && (
                <div
                  className={`text-sm rounded-lg px-3 py-2 ${
                    saveState === "success"
                      ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/40"
                      : "bg-red-500/10 text-red-200 border border-red-500/40"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={saveState === "saving"}
                className="w-full rounded-xl border border-white/40 bg-white text-black py-2.5 text-sm font-semibold tracking-wide disabled:opacity-60 disabled:cursor-not-allowed hover:bg-black hover:text-white hover:border-white transition-colors"
              >
                {saveState === "saving"
                  ? editMode
                    ? "Updating rate…"
                    : "Saving rate…"
                  : editMode
                  ? "Update FX rate"
                  : "Save FX rate"}
              </button>
            </form>

            {/* Small caption */}
            <p className="mt-2 text-[11px] text-center text-white/50">
              Below is a live snapshot of SSP vs key currencies based on the
              latest entries.
            </p>

            {/* Chart + insights directly under the form */}
            <FxTrendChart />
          </section>

          {/* RIGHT – RECENT RATES TABLE (scrolls internally) */}
          <section className="border border-white/10 rounded-xl p-4 sm:p-4 bg-black/40 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 gap-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase text-white/80">
                Recent FX rates
              </h2>
              <button
                type="button"
                onClick={fetchRecentRates}
                className="text-[11px] px-2 py-1 rounded-lg border border-white/20 hover:border-white hover:bg-white hover:text-black transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* changed wrapper here */}
            <div className="mt-2 max-h-[380px] overflow-y-auto pr-1">
              {ratesState === "loading" && (
                <p className="text-xs text-white/60">
                  Loading recent rates…
                </p>
              )}

              {ratesState === "error" && (
                <p className="text-xs text-red-300">
                  {ratesError || "Failed to load recent FX rates."}
                </p>
              )}

              {ratesState !== "loading" &&
                rates.length === 0 &&
                !ratesError && (
                  <p className="text-xs text-white/60">
                    No FX rates have been entered yet.
                  </p>
                )}

              {rates.length > 0 && (
                <div className="mt-1 overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/15 text-white/70">
                        <th className="text-left py-1.5 pr-3 font-medium">
                          Date
                        </th>
                        <th className="text-left py-1.5 px-3 font-medium">
                          Currency
                        </th>
                        <th className="text-right py-1.5 px-3 font-medium">
                          Mid rate
                        </th>
                        <th className="text-center py-1.5 px-3 font-medium">
                          Official
                        </th>
                        <th className="text-right py-1.5 px-3 font-medium whitespace-nowrap">
                          Created at
                        </th>
                        <th className="text-right py-1.5 pl-3 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((rate) => (
                        <tr
                          key={
                            rate.id ??
                            `${rate.asOfDate}-${rate.quoteCurrency}-${rate.created_at}`
                          }
                          className="border-b border-white/10 last:border-0"
                        >
                          <td className="py-1.5 pr-3 align-top">
                            <span className="font-mono text-[11px]">
                              {rate.asOfDate ?? "-"}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 align-top">
                            <span className="font-mono text-[11px]">
                              {rate.quoteCurrency}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 align-top text-right">
                            <span className="font-mono text-[11px]">
                              {typeof rate.rateMid === "number"
                                ? rate.rateMid.toLocaleString("en-US", {
                                    minimumFractionDigits: 4,
                                    maximumFractionDigits: 4,
                                  })
                                : rate.rateMid}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 align-top text-center">
                            {rate.isOfficial ? (
                              <span className="inline-flex items-center justify-center rounded-full border border-emerald-400/70 px-2 py-0.5 text-[10px] text-emerald-200">
                                Official
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-full border border-white/30 px-2 py-0.5 text-[10px] text-white/70">
                                Unofficial
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 align-top text-right whitespace-nowrap">
                            <span className="font-mono text-[10px] text-white/70">
                              {rate.created_at
                                ? new Date(
                                    rate.created_at
                                  ).toLocaleString("en-GB", {
                                    year: "2-digit",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </span>
                          </td>
                          <td className="py-1.5 pl-3 align-top text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(rate)}
                              className="text-[10px] px-2 py-0.5 rounded-lg border border-white/40 text-white/80 hover:bg-white hover:text-black transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rate.id)}
                              className="text-[10px] px-2 py-0.5 rounded-lg border border-red-500/60 text-red-200 hover:bg-red-500 hover:text-black hover:border-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
