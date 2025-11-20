import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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

type MarketSummaryResponse = {
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
    label: string;
  };
  volatility: {
    window_days: number;
    avg_daily_move_pct: number | null;
  };
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

export default async function HomePage() {
  const [latestRates, usdSummary, usdHistory, recentRates] =
    await Promise.all([
      fetchJson<LatestRatesResponse>("/api/v1/rates/latest?base=SSP"),
      fetchJson<MarketSummaryResponse>(
        "/api/v1/summary/market?base=SSP&quote=USD"
      ),
      fetchJson<HistoryResponse>(
        "/api/v1/rates/history?base=SSP&quote=USD&days=30"
      ),
      fetchJson<RecentRatesResponse>("/api/v1/rates/recent?base=SSP&limit=10"),
    ]);

  const latestDate = latestRates?.as_of_date ?? "-";
  const latestBase = latestRates?.base ?? "SSP";

  const usdMid = usdSummary?.mid_rate ?? null;
  const usdChangePct = usdSummary?.change_pct_vs_previous ?? null;

  const usdMin30 =
    usdHistory?.points && usdHistory.points.length > 0
      ? Math.min(...usdHistory.points.map((p) => p.mid))
      : null;
  const usdMax30 =
    usdHistory?.points && usdHistory.points.length > 0
      ? Math.max(...usdHistory.points.map((p) => p.mid))
      : null;

  const latestRatesArray =
    latestRates?.rates
      ? Object.entries(latestRates.rates).sort(([a], [b]) =>
          a.localeCompare(b)
        )
      : [];

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
                  {usdSummary?.trend?.label ?? "Range-bound"}
                </p>
              </div>
            </div>

            <p className="text-[0.7rem] text-zinc-500">
              Snapshot powered by{" "}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-[0.7rem]">
                /api/v1/summary/market
              </code>
              .
            </p>
          </div>
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
        Built by <span className="text-zinc-200">Savvy Gorilla Technologies™</span>
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
