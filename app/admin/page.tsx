// app/admin/page.tsx
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

// Register Chart.js components once
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

function FxTrendChart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<FxChartPoint[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/chart-data?quote=USD&limit=90");
        const json = await res.json();

        if (!res.ok || json?.error) {
          if (!cancelled) {
            setError(json?.error || json?.message || "Failed to load chart data.");
            setPoints([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setPoints(json.points ?? []);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unexpected error while loading chart data.");
          setPoints([]);
          setLoading(false);
        }
      }
    }

    loadChart();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-[11px] text-white/60">Loading USD/SSP trend…</p>
    );
  }

  if (error) {
    return (
      <p className="text-[11px] text-red-300">
        {error || "Failed to load USD/SSP trend."}
      </p>
    );
  }

  if (!points.length) {
    return (
      <p className="text-[11px] text-white/60">
        Not enough data yet to display a trend.
      </p>
    );
  }

  const labels = points.map((p) => p.date);
  const dataValues = points.map((p) => p.rateMid);

  const data = {
    labels,
    datasets: [
      {
        label: "USD/SSP mid rate",
        data: dataValues,
        borderColor: "#ffffff",
        backgroundColor: "rgba(255,255,255,0.12)",
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: "#ffffff",
        tension: 0.25,
        fill: true,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          color: "rgba(255,255,255,0.7)",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
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
        display: false,
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
    <div className="mt-3 h-40 sm:h-48 md:h-56">
      <Line data={data} options={options} />
    </div>
  );
}

export default function AdminPage() {
  // Auth gate state
  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [asOfDate, setAsOfDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [quoteCurrency, setQuoteCurrency] = useState<string>("USD");
  const [rateMid, setRateMid] = useState<string>("");
  const [isOfficial, setIsOfficial] = useState<boolean>(true);

  // Create/Edit state
  const [editMode, setEditMode] = useState(false);
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  // Status messages
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Table state
  const [rates, setRates] = useState<FxRate[]>([]);
  const [ratesState, setRatesState] = useState<"idle" | "loading" | "error">("idle");
  const [ratesError, setRatesError] = useState<string | null>(null);

  async function fetchRecentRates() {
    try {
      setRatesState("loading");
      setRatesError(null);
      const res = await fetch("/api/admin/recent-rates");
      const json = await res.json();
      if (!res.ok || json?.error) {
        setRatesState("error");
        setRatesError(json?.error || json?.message || "Failed to load recent FX rates.");
        setRates([]);
        return;
      }
      setRates(json?.data ?? []);
      setRatesState("idle");
    } catch (err: any) {
      setRatesState("error");
      setRatesError(err?.message || "Unexpected error while loading FX rates.");
      setRates([]);
    }
  }

  // Check admin auth on mount
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
        headers: {
          "Content-Type": "application/json",
        },
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

      // After save, stay on current values but exit edit mode
      setEditMode(false);
      setEditingRateId(null);
      setEditingLabel(null);

      fetchRecentRates();
    } catch (err: any) {
      setSaveState("error");
      setMessage(
        err?.message ? `Unexpected error: ${err.message}` : "Unexpected error while saving FX rate.",
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.error) {
        alert(json?.error || json?.message || "Failed to delete FX rate.");
        return;
      }

      // If we deleted the one we're editing, reset the form
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
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl bg-white/5">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-center">
            Savvy Rilla FX – Admin
          </h1>
          <p className="mt-2 text-sm text-center text-white/70">
            Manual mid-rate entry for SSP vs global currencies.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
          {/* LEFT – FORM */}
          <section>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Editing banner */}
              {editMode && editingLabel && (
                <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex items-center justify-between gap-2">
                  <span>
                    Editing rate for <span className="font-semibold">{editingLabel}</span>
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

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">As of date</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm outline-none focus:border-white focus:ring-1 focus:ring-white"
                  required
                />
                <p className="text-xs text-white/60">Trading date the rate applies to.</p>
              </div>

              {/* Quote currency */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Quote currency</label>
                <input
                  type="text"
                  value={quoteCurrency}
                  onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())}
                  className="w-full rounded-lg bg-black border border-white/20 px-3 py-2 text-sm uppercase tracking-wide outline-none focus:border-white focus:ring-1 focus:ring-white"
                  placeholder="USD"
                  maxLength={10}
                  required
                />
                <p className="text-xs text-white/60">
                  Example: <span className="font-mono">USD</span>,{" "}
                  <span className="font-mono">EUR</span>, <span className="font-mono">KES</span>. Base
                  is assumed to be SSP.
                </p>
              </div>

              {/* Mid rate */}
              <div className="space-y-1.5">
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

              {/* Official flag */}
              <div className="flex items-center justify-between gap-3 border border-white/10 rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Mark as official rate</p>
                  <p className="text-xs text-white/60">
                    If checked, this rate can be used as the official BoSS FX reference.
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

              {/* Status message */}
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

              {/* Submit button */}
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

            <p className="mt-6 text-[11px] text-center text-white/50">
              For now this is a simple manual entry console. Later we can add tables, charts, and audit
              trails.
            </p>
          </section>

          {/* RIGHT – RECENT RATES TABLE + CHART */}
          <section className="border border-white/10 rounded-xl p-4 sm:p-5 bg-black/40 flex flex-col">
            <div className="flex items-center justify-between mb-3 gap-3">
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

            {ratesState === "loading" && (
              <p className="text-xs text-white/60">Loading recent rates…</p>
            )}

            {ratesState === "error" && (
              <p className="text-xs text-red-300">
                {ratesError || "Failed to load recent FX rates."}
              </p>
            )}

            {ratesState !== "loading" && rates.length === 0 && !ratesError && (
              <p className="text-xs text-white/60">No FX rates have been entered yet.</p>
            )}

            {rates.length > 0 && (
              <div className="mt-1 overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/15 text-white/70">
                      <th className="text-left py-2 pr-3 font-medium">Date</th>
                      <th className="text-left py-2 px-3 font-medium">Currency</th>
                      <th className="text-right py-2 px-3 font-medium">Mid rate</th>
                      <th className="text-center py-2 px-3 font-medium">Official</th>
                      <th className="text-right py-2 px-3 font-medium whitespace-nowrap">
                        Created at
                      </th>
                      <th className="text-right py-2 pl-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr
                        key={rate.id ?? `${rate.asOfDate}-${rate.quoteCurrency}-${rate.created_at}`}
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
                              ? new Date(rate.created_at).toLocaleString("en-GB", {
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

            {/* USD/SSP Trend chart */}
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  USD/SSP trend (mid rate)
                </h3>
              </div>
              <FxTrendChart />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
