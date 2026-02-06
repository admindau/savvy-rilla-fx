// app/api/v1/rates/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FxDailyRow = {
  as_of_date: string;
  rate_mid: number | string | null;
};

type FxChartPoint = { date: string; mid: number };

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status, headers: { "X-FX-API-Version": "v1" } }
  );
}

/**
 * Permanent, explicit "ALL" behavior:
 * - mode=all fetches full history (paginated) ordered ASC (oldest → newest).
 * - Optional limit caps the number of returned points (keeps latest points).
 *
 * This guarantees that when you backfill to 2011, the response reflects it.
 */
async function fetchAllHistory(opts: {
  base: string;
  quote: string;
  limit: number; // max points to return
}) {
  const { base, quote, limit } = opts;

  const CHUNK_SIZE = 1000; // Supabase max rows per request
  let allRows: FxDailyRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseServer
      .from("fx_daily_rates")
      .select("as_of_date, rate_mid")
      .eq("base_currency", base)
      .eq("quote_currency", quote)
      .order("as_of_date", { ascending: true }) // oldest → newest
      .range(offset, offset + CHUNK_SIZE - 1);

    if (error) {
      return { ok: false as const, error };
    }

    const rows = (data ?? []) as FxDailyRow[];
    allRows = allRows.concat(rows);

    if (rows.length < CHUNK_SIZE) break; // reached end
    offset += CHUNK_SIZE;

    // Safety: if DB is huge, we still keep loading, but we can stop once we
    // have more than we need (we keep latest `limit` later).
    if (allRows.length >= limit + CHUNK_SIZE) {
      // We already have enough plus a buffer; stop scanning further.
      break;
    }
  }

  let truncated = false;

  // If larger than limit, keep the latest `limit` points.
  if (allRows.length > limit) {
    truncated = true;
    allRows = allRows.slice(allRows.length - limit);
  }

  const points: FxChartPoint[] = allRows
    .map((row) => {
      const mid = toNumber(row.rate_mid);
      if (mid == null) return null;
      return { date: row.as_of_date, mid };
    })
    .filter((p): p is FxChartPoint => p !== null);

  return { ok: true as const, points, truncated };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const base = (url.searchParams.get("base") ?? "SSP").toUpperCase();
  const quote = (url.searchParams.get("quote") ?? "USD").toUpperCase();

  const mode = (url.searchParams.get("mode") ?? "").toLowerCase();
  const daysParam = url.searchParams.get("days");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  // Public safety caps. Your dataset (2011 → today daily) is ~5k points, so this is plenty.
  const DEFAULT_ALL_LIMIT = 20000;
  const HARD_MAX_LIMIT = 50000;

  const limitParam = url.searchParams.get("limit");
  const rawLimit = limitParam ? Number(limitParam) : DEFAULT_ALL_LIMIT;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 1
      ? Math.min(Math.floor(rawLimit), HARD_MAX_LIMIT)
      : DEFAULT_ALL_LIMIT;

  // ✅ Explicit ALL mode (permanent contract)
  if (mode === "all") {
    const result = await fetchAllHistory({ base, quote, limit });

    if (!result.ok) {
      return jsonError(
        500,
        "DB_ERROR",
        "Failed to load FX history.",
        (result as any).error?.message
      );
    }

    const points = result.points;
    const metaFrom = points.length > 0 ? points[0].date : "";
    const metaTo = points.length > 0 ? points[points.length - 1].date : "";

    return NextResponse.json(
      {
        pair: `${base}/${quote}`,
        base,
        quote,
        points,
        meta: {
          from: metaFrom,
          to: metaTo,
          count: points.length,
          truncated: result.truncated,
        },
      },
      { status: 200, headers: { "X-FX-API-Version": "v1" } }
    );
  }

  // ✅ Existing windowed behavior (days OR from/to)
  // If you already had logic here, keep your semantics.
  // This implementation supports:
  // - days=N  -> computes from/to
  // - from/to -> uses the provided range
  // - If none provided, it behaves like a safe "recent" window (365d).
  let from = fromParam ?? null;
  let to = toParam ?? null;

  if (daysParam && !from && !to) {
    const days = Number(daysParam);
    if (!Number.isFinite(days) || days <= 0) {
      return jsonError(400, "INVALID_PARAMETER", "days must be a positive integer.");
    }
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - Math.floor(days) + 1);
    from = start.toISOString().slice(0, 10);
    to = today.toISOString().slice(0, 10);
  }

  // If nothing provided, default to 365d (keeps public endpoint safe & fast)
  if (!from || !to) {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 365 + 1);
    from = start.toISOString().slice(0, 10);
    to = today.toISOString().slice(0, 10);
  }

  const { data, error } = await supabaseServer
    .from("fx_daily_rates")
    .select("as_of_date, rate_mid")
    .eq("base_currency", base)
    .eq("quote_currency", quote)
    .gte("as_of_date", from)
    .lte("as_of_date", to)
    .order("as_of_date", { ascending: true });

  if (error) {
    return jsonError(500, "DB_ERROR", "Failed to load FX history.", error.message);
  }

  const points: FxChartPoint[] =
    (data ?? [])
      .map((row: FxDailyRow) => {
        const mid = toNumber(row.rate_mid);
        if (mid == null) return null;
        return { date: row.as_of_date, mid };
      })
      .filter((p): p is FxChartPoint => p !== null) ?? [];

  return NextResponse.json(
    {
      pair: `${base}/${quote}`,
      base,
      quote,
      points,
      meta: { from, to, count: points.length },
    },
    { status: 200, headers: { "X-FX-API-Version": "v1" } }
  );
}
