import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import FxHistoryChart from "@/components/fx-history-chart";
import FxMultiCurrencyMarketSnapshot from "@/components/fx-multicurrency-market-snapshot";
import {
  buildInsightsFromSummary,
  buildMarketHealthFromSummary,
  type MarketSummary,
} from "@/lib/fx/insights";

export const metadata: Metadata = {
  title:
    "Savvy Rilla FX API – Real-time FX infrastructure for SSP & key global currencies",
  description:
    "Public, read-only FX API for South Sudanese Pound (SSP) markets. Stream official rates, power dashboards, and integrate FX data into your applications with a clean, versioned API.",
  openGraph: {
    title: "Savvy Rilla FX API – Real-time FX infrastructure for SSP",
    description:
      "Focused FX backend for South Sudanese Pound (SSP) markets. Built by Savvy Gorilla Technologies™.",
    url: "https://fx.savvyrilla.tech",
    siteName: "Savvy Rilla FX API",
    type: "website",
    images: [
      {
        url: "https://fx.savvyrilla.tech/og-fx-api.png",
        width: 1200,
        height: 630,
        alt: "Savvy Rilla FX API – Market snapshot for SSP & key currencies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Savvy Rilla FX API – Real-time FX for SSP",
    description:
      "Public read-only FX API for SSP & key global currencies. Powered by Savvy Gorilla Technologies™.",
    images: ["https://fx.savvyrilla.tech/og-fx-api.png"],
  },
};

export const dynamic = "force-dynamic";

type LatestRatesResponse = {
  base: string;
  as_of_date: string;
  source?: string;
  rates: Record<string, number>;
};

type HistoryResponse = {
  pair: string;
  base: string;
  quote: string;
  points: { date: string; mid: number }[];
  meta: { from: string; to: string; count: number };
};

type RecentRatesResponse = {
  data: {
    id: number;
    as_of_date: string;
    base_currency: string;
    quote_currency: string;
    rate_mid: number;
    is_official: boolean | null;
    is_manual_override: boolean | null;
    source_id: number | null;
  }[];
  meta: {
    limit: number;
    base: string;
  };
};

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_FX_API_ORIGIN) {
    return process.env.NEXT_PUBLIC_FX_API_ORIGIN;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const base = getApiBaseUrl();
    const url = path.startsWith("http") ? path : `${base}${path}`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`FX API error for ${url}:`, res.status, await res.text());
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error(`FX API fetch failed for ${path}:`, err);
    return null;
  }
}

/**
 * Simple rule-based “AI-style” commentary for USD/SSP,
 * built from the summary + 30d range.
 */
function buildUsdSspCommentary(
  summary: MarketSummary,
  opts: { min30: number | null; max30: number | null }
): string {
  const { min30, max30 } = opts;
  const date = summary.as_of_date ?? "today";
  const mid = summary.mid_rate;
  const change = summary.change_pct_vs_previous ?? null;
  const trendLabel = summary.trend?.label ?? "Range-Bound";

  if (mid == null) {
    return `USD/SSP summary data is not available for ${date}.`;
  }

  const midStr = mid.toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });

  let sentence1: string;

  if (change == null || Number.isNaN(change)) {
    sentence1 = `On ${date}, USD/SSP fixed at ${midStr}.`;
  } else {
    const changeAbs = Math.abs(change);
    const changeStr = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;

    if (changeAbs < 0.05) {
      sentence1 = `On ${date}, USD/SSP was broadly unchanged, fixing at ${midStr} (${changeStr} vs the previous fixing).`;
    } else if (changeAbs < 0.3) {
      sentence1 =
        change > 0
          ? `On ${date}, USD/SSP edged higher to ${midStr} (${changeStr} vs the previous fixing).`
          : `On ${date}, USD/SSP eased lower to ${midStr} (${changeStr} vs the previous fixing).`;
    } else {
      sentence1 =
        change > 0
          ? `On ${date}, USD/SSP moved notably higher to ${midStr} (${changeStr} vs the previous fixing).`
          : `On ${date}, USD/SSP weakened noticeably to ${midStr} (${changeStr} vs the previous fixing).`;
    }
  }

  let sentence2 = "";
  if (min30 != null && max30 != null) {
    const minStr = min30.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
    const maxStr = max30.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });
    sentence2 = ` Over the last 30 days, the pair has traded between ${minStr} and ${maxStr}.`;
  }

  let sentence3 = "";
  if (trendLabel) {
    sentence3 = ` Current trend signal is “${trendLabel}”, pointing to a ${trendLabel.toLowerCase()} market regime.`;
  }

  return `${sentence1}${sentence2}${sentence3}`.trim();
}


function formatRate(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function getMovementClass(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "text-zinc-200";
  if (Math.abs(value) < 0.05) return "text-zinc-200";
  return value >= 0 ? "text-emerald-400" : "text-red-400";
}

function getHealthBadgeClass(tone: string) {
  if (tone === "positive") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (tone === "warning") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (tone === "danger") return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-300";
}

export default async function HomePage() {
  const [
    latestRates,
    usdSummary,
    history30,
    history90,
    history365,
    historyAll,
    recentRates,
  ] = await Promise.all([
    fetchJson<LatestRatesResponse>("/api/v1/rates/latest?base=SSP"),
    fetchJson<MarketSummary>("/api/v1/summary/market?base=SSP&quote=USD"),
    fetchJson<HistoryResponse>(
      "/api/v1/rates/history?base=SSP&quote=USD&days=30"
    ),
    fetchJson<HistoryResponse>(
      "/api/v1/rates/history?base=SSP&quote=USD&days=90"
    ),
    fetchJson<HistoryResponse>(
      "/api/v1/rates/history?base=SSP&quote=USD&days=365"
    ),
    // "All" history – backend can treat missing `days` as full history.
    fetchJson<HistoryResponse>("/api/v1/rates/history?base=SSP&quote=USD"),
    fetchJson<RecentRatesResponse>("/api/v1/rates/recent?base=SSP&limit=10"),
  ]);

  const latestDate = latestRates?.as_of_date ?? "-";
  const latestBase = latestRates?.base ?? "SSP";

  const usdMid = usdSummary?.mid_rate ?? null;
  const usdChangePct = usdSummary?.change_pct_vs_previous ?? null;

  const usdMin30 =
    history30?.points && history30.points.length > 0
      ? Math.min(...history30.points.map((p) => p.mid))
      : null;
  const usdMax30 =
    history30?.points && history30.points.length > 0
      ? Math.max(...history30.points.map((p) => p.mid))
      : null;

  const latestRatesArray =
    latestRates?.rates
      ? Object.entries(latestRates.rates).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      : [];

  const fxInsights = usdSummary ? buildInsightsFromSummary(usdSummary) : [];
  const marketHealth = buildMarketHealthFromSummary(usdSummary);
  const marketHealthBadgeClass = getHealthBadgeClass(marketHealth.tone);
  const healthDrivers = marketHealth.drivers.slice(0, 3);
  const dailyMove = usdSummary?.changes?.daily_pct ?? usdChangePct;
  const sevenDayMove = usdSummary?.changes?.seven_day_pct ?? null;
  const thirtyDayMove = usdSummary?.changes?.thirty_day_pct ?? null;
  const thirtyDayAverage = usdSummary?.averages?.thirty_day ?? null;
  const thirtyDaySpread = usdSummary?.ranges?.thirty_day?.spread_pct ?? null;
  const historyCount = usdSummary?.observations?.history_count ?? 0;

  // If "all" history is missing or super short, fall back to 365d series
  const allHistoryPoints =
    historyAll?.points && historyAll.points.length > 1
      ? historyAll.points
      : history365?.points ?? [];

  // mark as used so TS doesn't complain, but we don't expose "All" in the chart
  void allHistoryPoints;

  const historySeries = [
    {
      label: "30d",
      days: 30,
      points: history30?.points ?? [],
    },
    {
      label: "90d",
      days: 90,
      points: history90?.points ?? [],
    },
    {
      label: "365d",
      days: 365,
      points: history365?.points ?? [],
    },
  ].filter((s) => s.points.length > 1);

  const usdCommentary =
    usdSummary != null
      ? buildUsdSspCommentary(usdSummary, {
          min30: usdMin30,
          max30: usdMax30,
        })
      : null;

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-10">
        {/* Top bar / logo */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8">
              <Image
                src="/savvy-gorilla-logo-white.png"
                alt="Savvy Gorilla Technologies"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                Savvy Gorilla Technologies™
              </p>
              <p className="text-xs text-zinc-500">
                FX infrastructure · South Sudan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/docs"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800 transition"
            >
              View API docs
            </Link>
          </div>
        </header>

        {/* Hero + key stat */}
        <section className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-start">
          <div className="space-y-5">
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-zinc-500">
              Savvy Rilla FX API
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Real-time FX infrastructure for SSP &amp; key global currencies.
            </h1>
            <p className="max-w-xl text-sm text-zinc-400">
              A focused FX backend for South Sudanese Pound (SSP) markets.
              Stream official rates, power dashboards, and integrate FX data
              into your applications with a clean, versioned API.
            </p>

            <p className="text-xs text-zinc-500">
              Powered by{" "}
              <span className="font-medium text-zinc-200">
                Savvy Gorilla Technologies™
              </span>
              .
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/docs"
                className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-black hover:bg-white transition"
              >
                Get started with the API
              </Link>
              <a
                href="#fx-dashboard"
                className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900 transition"
              >
                View FX dashboard
              </a>
            </div>

            <div className="flex flex-wrap gap-6 pt-4 text-xs text-zinc-500">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Base currency
                </p>
                <p className="text-sm text-zinc-200">{latestBase}</p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Latest fixing date
                </p>
                <p className="text-sm text-zinc-200">{latestDate}</p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  API version
                </p>
                <p className="text-sm text-zinc-200">v1 · public read-only</p>
              </div>
            </div>
          </div>

          {/* USD/SSP overview card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 text-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Market snapshot
                </p>
                <p className="text-sm font-medium">USD / SSP</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-medium text-emerald-400">
                Live from v1 API
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/35 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                    Market health
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-3xl font-semibold tracking-tight">
                      {marketHealth.score}
                    </p>
                    <p className="text-xs text-zinc-500">/ 100</p>
                  </div>
                </div>
                <span
                  className={
                    marketHealth.tone === "positive"
                      ? "rounded-full bg-emerald-500/10 px-3 py-1 text-[0.7rem] font-medium text-emerald-400"
                      : marketHealth.tone === "warning"
                      ? "rounded-full bg-amber-500/10 px-3 py-1 text-[0.7rem] font-medium text-amber-300"
                      : "rounded-full bg-zinc-800 px-3 py-1 text-[0.7rem] font-medium text-zinc-300"
                  }
                >
                  {marketHealth.label}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className={
                    marketHealth.tone === "positive"
                      ? "h-full rounded-full bg-emerald-400"
                      : marketHealth.tone === "warning"
                      ? "h-full rounded-full bg-amber-300"
                      : "h-full rounded-full bg-zinc-400"
                  }
                  style={{ width: `${marketHealth.score}%` }}
                />
              </div>
              <p className="mt-2 text-[0.7rem] leading-relaxed text-zinc-500">
                Derived from daily movement, recent range, volatility, and trend
                consistency. This is an experimental Savvy Rilla intelligence
                signal, not financial advice.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-zinc-800 py-4">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Mid rate
                </p>
                <p className="text-lg font-semibold">
                  {usdMid
                    ? usdMid.toLocaleString("en-US", {
                        maximumFractionDigits: 4,
                      })
                    : "—"}
                </p>
                <p className="text-[0.7rem] text-zinc-500">
                  {usdSummary?.as_of_date ?? "No data"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Day change
                </p>
                <p
                  className={
                    usdChangePct == null
                      ? "text-sm"
                      : usdChangePct >= 0
                      ? "text-sm font-medium text-emerald-400"
                      : "text-sm font-medium text-red-400"
                  }
                >
                  {usdChangePct == null
                    ? "—"
                    : `${usdChangePct >= 0 ? "+" : ""}${usdChangePct.toFixed(
                        2
                      )}%`}
                </p>
                <p className="text-[0.7rem] text-zinc-500">vs previous fixing</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  30d range
                </p>
                <p className="text-zinc-200">
                  {usdMin30 && usdMax30
                    ? `${usdMin30.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })} – ${usdMax30.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Trend (experimental)
                </p>
                <p className="text-zinc-200">
                  {usdSummary?.trend?.label ?? "Range-Bound"}
                </p>
              </div>
            </div>

            {/* Existing history chart (UNCHANGED) */}
            {historySeries.length > 0 && <FxHistoryChart series={historySeries} />}

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs">
              <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                Health drivers
              </p>
              <ul className="space-y-1.5 text-[0.75rem] text-zinc-300">
                {marketHealth.drivers.map((driver) => (
                  <li key={driver} className="flex gap-2">
                    <span className="mt-[6px] h-1 w-1 rounded-full bg-zinc-500" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[0.7rem] text-zinc-500">
              Snapshot powered by{" "}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-[0.7rem]">
                /api/v1/summary/market
              </code>
              .
            </p>

            {usdSummary && (
              <>
                {/* Daily FX commentary */}
                {usdCommentary && (
                  <div className="mt-3 border-t border-zinc-800 pt-3 text-xs">
                    <p className="mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                      Daily FX commentary (beta)
                    </p>
                    <p className="text-[0.8rem] text-zinc-300 leading-relaxed">
                      {usdCommentary}
                    </p>
                  </div>
                )}

                {/* Smart FX insights */}
                <div className="mt-3 border-t border-zinc-800 pt-3 text-xs">
                  <p className="mb-2 text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                    Smart FX insights
                  </p>

                  {fxInsights.length === 0 ? (
                    <p className="text-zinc-500 text-[0.75rem]">
                      No insights available yet for this pair.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-[0.8rem] text-zinc-300">
                      {fxInsights.map((insight, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-[6px] h-1 w-1 rounded-full bg-zinc-500" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Embed widget snippet */}
                <div className="mt-3 border-t border-zinc-800 pt-3 text-[0.7rem] text-zinc-500 space-y-2">
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                    Embed this snapshot
                  </p>
                  <p className="text-[0.7rem] text-zinc-400">
                    Paste this snippet into any website to embed a live USD/SSP
                    widget.
                  </p>
                  <pre className="rounded-lg bg-zinc-950 border border-zinc-900 p-2 text-[0.65rem] overflow-x-auto text-zinc-300">
{`<iframe
  src="https://fx.savvyrilla.tech/widget/usd-ssp"
  width="360"
  height="240"
  style="border:0; background:#000; color:#fff;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>`}
                  </pre>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Market Intelligence Center */}
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.25em] text-zinc-500">
                Market intelligence center
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                USD/SSP signal summary
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                A compact interpretation layer built from the same read-only FX
                API. It turns raw rate records into market health, trend,
                volatility, and movement signals.
              </p>
            </div>
            <div className="rounded-full border border-zinc-800 bg-black px-3 py-1 text-[0.7rem] text-zinc-400">
              Intelligence layer · FX-II-01C
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-2xl border border-zinc-800 bg-black/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.22em] text-zinc-500">
                    Market health score
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-5xl font-semibold tracking-tight text-zinc-50">
                      {marketHealth.score}
                    </p>
                    <p className="pb-2 text-sm text-zinc-500">/100</p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${marketHealthBadgeClass}`}
                >
                  {marketHealth.label}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full rounded-full bg-zinc-100"
                  style={{ width: `${marketHealth.score}%` }}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-400">
                {marketHealth.description}
              </p>

              <div className="mt-4 space-y-2">
                {healthDrivers.map((driver) => (
                  <div
                    key={driver}
                    className="flex gap-2 rounded-xl border border-zinc-900 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Latest USD/SSP
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-50">
                  {formatRate(usdMid, 4)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Fixing date: {usdSummary?.as_of_date ?? latestDate}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                  Data depth
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-50">
                  {historyCount.toLocaleString("en-US")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Observations feeding the signal
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                Daily move
              </p>
              <p className={`mt-2 text-lg font-semibold ${getMovementClass(dailyMove)}`}>
                {formatPercent(dailyMove)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">vs previous fixing</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                7-day trend
              </p>
              <p className={`mt-2 text-lg font-semibold ${getMovementClass(sevenDayMove)}`}>
                {usdSummary?.trend?.label ?? "Range-Bound"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatPercent(sevenDayMove)} over 7 days
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                30-day move
              </p>
              <p className={`mt-2 text-lg font-semibold ${getMovementClass(thirtyDayMove)}`}>
                {formatPercent(thirtyDayMove)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Avg rate: {formatRate(thirtyDayAverage, 2)}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
                Volatility
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-50">
                {usdSummary?.volatility?.label ?? "unknown"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                30d spread: {formatPercent(thirtyDaySpread)}
              </p>
            </div>
          </div>
        </section>

        {/* NEW Multi-currency Market Snapshot (ADDED, does not replace anything) */}
        <section className="space-y-3">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-zinc-500">
              FX snapshot
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              SSP vs key currencies (multi-currency)
            </h2>
            <p className="text-sm text-zinc-400 max-w-xl">
              Switch currencies, change the window (30d / 90d / 365d / All), and
              zoom/pan to inspect market structure.
            </p>
          </div>

          <FxMultiCurrencyMarketSnapshot />
        </section>

        {/* FX Dashboard */}
        <section id="fx-dashboard" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.25em] text-zinc-500">
                FX dashboard
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                Public FX board for SSP markets
              </h2>
              <p className="text-sm text-zinc-400 max-w-xl">
                A simple, read-only view backed by the same FX data used by
                internal tools. Ideal for analysts, journalists, and developers
                who want a quick glance before diving into the API.
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              Latest fixing date:{" "}
              <span className="font-medium text-zinc-200">{latestDate}</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Left: Latest rates grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <p className="text-zinc-400">
                  Latest mid rates vs{" "}
                  <span className="font-medium text-zinc-100">
                    {latestBase}
                  </span>
                </p>
                <code className="rounded-full bg-zinc-950 px-3 py-1 text-[0.65rem] text-zinc-500 border border-zinc-800">
                  GET /api/v1/rates/latest
                </code>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70">
                <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950/90 text-[0.7rem] text-zinc-400">
                  <div className="px-3 py-2">Quote</div>
                  <div className="px-3 py-2 text-right">Mid rate</div>
                  <div className="px-3 py-2 text-right">Approx per 1 unit</div>
                </div>
                <div className="max-h-64 overflow-y-auto text-xs">
                  {latestRatesArray.length === 0 ? (
                    <div className="px-3 py-4 text-zinc-500 text-[0.8rem]">
                      No rates available yet.
                    </div>
                  ) : (
                    latestRatesArray.map(([code, rate]) => (
                      <div
                        key={code}
                        className="grid grid-cols-3 border-t border-zinc-900/80 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-100">
                            {code}
                          </span>
                        </div>
                        <div className="text-right text-zinc-100">
                          {rate.toLocaleString("en-US", {
                            maximumFractionDigits: 4,
                          })}
                        </div>
                        <div className="text-right text-zinc-500">
                          1 {code} ≈{" "}
                          {rate === 0 ? "—" : (1 / rate).toFixed(6)}{" "}
                          {latestBase}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Recent fixes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <p className="text-zinc-400">
                  Recent FX records{" "}
                  <span className="text-zinc-500">(most recent first)</span>
                </p>
                <code className="rounded-full bg-zinc-950 px-3 py-1 text-[0.65rem] text-zinc-500 border border-zinc-800">
                  GET /api/v1/rates/recent
                </code>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70">
                <div className="grid grid-cols-[1.1fr_0.8fr_0.7fr] border-b border-zinc-800 bg-zinc-950/90 text-[0.7rem] text-zinc-400">
                  <div className="px-3 py-2">Date · Pair</div>
                  <div className="px-3 py-2 text-right">Mid rate</div>
                  <div className="px-3 py-2 text-right">Flags</div>
                </div>
                <div className="max-h-64 overflow-y-auto text-xs">
                  {recentRates?.data && recentRates.data.length > 0 ? (
                    recentRates.data.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-[1.1fr_0.8fr_0.7fr] border-t border-zinc-900/80 px-3 py-2"
                      >
                        <div>
                          <p className="text-zinc-100">{row.as_of_date}</p>
                          <p className="text-[0.7rem] text-zinc-500">
                            {row.base_currency}/{row.quote_currency}
                          </p>
                        </div>
                        <div className="text-right text-zinc-100">
                          {row.rate_mid.toLocaleString("en-US", {
                            maximumFractionDigits: 4,
                          })}
                        </div>
                        <div className="text-right text-[0.7rem] text-zinc-500 space-y-0.5">
                          {row.is_official && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Official
                            </div>
                          )}
                          {row.is_manual_override && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Manual
                            </div>
                          )}
                          {!row.is_official && !row.is_manual_override && (
                            <span className="text-zinc-600">—</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-zinc-500 text-[0.8rem]">
                      No recent records available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-4 border-t border-zinc-900 pt-4 text-[0.7rem] text-zinc-500">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left side */}
            <div className="flex items-center gap-2">
              <div className="relative h-4 w-4 opacity-60">
                <Image
                  src="/savvy-gorilla-logo-white.png"
                  alt="Savvy Gorilla Technologies"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-zinc-400">
                Savvy Rilla FX API v1 · Public read-only interface
              </span>
            </div>

            {/* Right side */}
            <div className="flex flex-wrap items-center gap-3 text-zinc-500">
              <span className="text-zinc-400">
                Built by{" "}
                <span className="text-zinc-200">
                  Savvy Gorilla Technologies™
                </span>
              </span>

              <span className="hidden sm:inline text-zinc-600">•</span>

              <span className="text-zinc-400">
                Made in Juba <span className="ml-0.5">🇸🇸</span>
              </span>

              <span className="hidden sm:inline text-zinc-600">•</span>

              <a
                href="https://savvyrilla.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-white transition"
              >
                savvyrilla.tech
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
