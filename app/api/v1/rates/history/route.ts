// app/api/v1/rates/history/route.ts
import { NextRequest } from "next/server";
import { createApiContext, type ApiContext } from "@/lib/api/request-id";
import { apiError, apiJson } from "@/lib/api/response";
import { apiOptions } from "@/lib/api/middleware";
import { applyRateLimit } from "@/lib/api/rate-limit";
import {
  isCurrencyCode,
  isIsoDate,
  normalizeCurrencyCode,
  parsePositiveInteger,
} from "@/lib/api/validation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const OPTIONS = apiOptions;


type FxDailyRow = {
  as_of_date: string;
  rate_mid: number | string | null;
};

type FxChartPoint = { date: string; mid: number };

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchAllHistory(opts: {
  base: string;
  quote: string;
  limit: number;
}) {
  const { base, quote, limit } = opts;

  const CHUNK_SIZE = 1000;
  let allRows: FxDailyRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseServer
      .from("fx_daily_rates")
      .select("as_of_date, rate_mid")
      .eq("base_currency", base)
      .eq("quote_currency", quote)
      .order("as_of_date", { ascending: true })
      .range(offset, offset + CHUNK_SIZE - 1);

    if (error) {
      return { ok: false as const, error };
    }

    const rows = (data ?? []) as FxDailyRow[];
    allRows = allRows.concat(rows);

    if (rows.length < CHUNK_SIZE) break;
    offset += CHUNK_SIZE;

    if (allRows.length >= limit + CHUNK_SIZE) break;
  }

  let truncated = false;

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

function validateDateRange(context: ApiContext, from: string, to: string) {
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return apiError(
      context,
      400,
      "INVALID_PARAMETER",
      "from and to must be valid dates in YYYY-MM-DD format."
    );
  }

  if (from > to) {
    return apiError(context, 400, "INVALID_PARAMETER", "from must be before or equal to to.");
  }

  return null;
}

export async function GET(req: NextRequest) {
  const context = createApiContext(req);
  const rateLimited = applyRateLimit(req, context);
  if (rateLimited) return rateLimited;
  const url = new URL(req.url);

  const base = normalizeCurrencyCode(url.searchParams.get("base"), "SSP");
  const quote = normalizeCurrencyCode(url.searchParams.get("quote"), "USD");

  if (!isCurrencyCode(base) || !isCurrencyCode(quote)) {
    return apiError(
      context,
      400,
      "INVALID_CURRENCY",
      "base and quote must be valid 3-letter currency codes."
    );
  }

  const mode = (url.searchParams.get("mode") ?? "").toLowerCase();
  const daysParam = url.searchParams.get("days");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const DEFAULT_ALL_LIMIT = 20000;
  const HARD_MAX_LIMIT = 50000;
  const limit = parsePositiveInteger(url.searchParams.get("limit"), DEFAULT_ALL_LIMIT, {
    min: 2,
    max: HARD_MAX_LIMIT,
  });

  if (mode === "all") {
    const result = await fetchAllHistory({ base, quote, limit });

    if (!result.ok) {
      return apiError(context, 500, "DB_ERROR", "Failed to load FX history.", result.error.message);
    }

    const points = result.points;
    const metaFrom = points.length > 0 ? points[0].date : "";
    const metaTo = points.length > 0 ? points[points.length - 1].date : "";

    return apiJson(context, {
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
    });
  }

  let from = fromParam ?? null;
  let to = toParam ?? null;

  if (daysParam && !from && !to) {
    const days = Number(daysParam);
    if (!Number.isFinite(days) || days <= 0) {
      return apiError(context, 400, "INVALID_PARAMETER", "days must be a positive integer.");
    }
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - Math.floor(days) + 1);
    from = start.toISOString().slice(0, 10);
    to = today.toISOString().slice(0, 10);
  }

  if (!from || !to) {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 365 + 1);
    from = start.toISOString().slice(0, 10);
    to = today.toISOString().slice(0, 10);
  }

  const dateRangeError = validateDateRange(context, from, to);
  if (dateRangeError) return dateRangeError;

  const { data, error } = await supabaseServer
    .from("fx_daily_rates")
    .select("as_of_date, rate_mid")
    .eq("base_currency", base)
    .eq("quote_currency", quote)
    .gte("as_of_date", from)
    .lte("as_of_date", to)
    .order("as_of_date", { ascending: true });

  if (error) {
    return apiError(context, 500, "DB_ERROR", "Failed to load FX history.", error.message);
  }

  const points: FxChartPoint[] =
    (data ?? [])
      .map((row: FxDailyRow) => {
        const mid = toNumber(row.rate_mid);
        if (mid == null) return null;
        return { date: row.as_of_date, mid };
      })
      .filter((p): p is FxChartPoint => p !== null) ?? [];

  return apiJson(context, {
    pair: `${base}/${quote}`,
    base,
    quote,
    points,
    meta: { from, to, count: points.length },
  });
}
