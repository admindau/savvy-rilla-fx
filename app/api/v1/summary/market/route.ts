// app/api/v1/summary/market/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const VERSION_HEADERS = { "X-FX-API-Version": "v1" };

export async function GET(req: NextRequest) {
  const supabase = supabaseServer;
  const url = new URL(req.url);

  const baseCurrency = url.searchParams.get("base") ?? "SSP";
  const quoteCurrency =
    (url.searchParams.get("quote") ?? "USD").toUpperCase();

  const { data: latestRow, error: latestError } = await supabase
    .from("fx_daily_rates")
    .select("as_of_date, rate_mid")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: latestError.message } },
      { status: 500, headers: VERSION_HEADERS }
    );
  }

  if (!latestRow) {
    return NextResponse.json(
      {
        error: {
          code: "NO_DATA",
          message: `No FX data for pair ${baseCurrency}/${quoteCurrency}.`,
        },
      },
      { status: 404, headers: VERSION_HEADERS }
    );
  }

  const asOfDate = latestRow.as_of_date;
  const latestMid = Number(latestRow.rate_mid);

  const { data: prevRow } = await supabase
    .from("fx_daily_rates")
    .select("as_of_date, rate_mid")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .lt("as_of_date", asOfDate)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let changePct: number | null = null;
  if (prevRow && prevRow.rate_mid) {
    const prevMid = Number(prevRow.rate_mid);
    if (prevMid !== 0) {
      changePct = ((latestMid - prevMid) / prevMid) * 100;
    }
  }

  // Very simple "range" placeholder — currently same-day
  const { data: rangeRows } = await supabase
    .from("fx_daily_rates")
    .select("rate_mid")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .gte("as_of_date", asOfDate)
    .lte("as_of_date", asOfDate);

  let rangeHigh = latestMid;
  let rangeLow = latestMid;

  for (const row of rangeRows ?? []) {
    const value = Number(row.rate_mid);
    rangeHigh = Math.max(rangeHigh, value);
    rangeLow = Math.min(rangeLow, value);
  }

  const volatilityAvgDailyMovePct = null;

  return NextResponse.json(
    {
      base: baseCurrency,
      quote: quoteCurrency,
      as_of_date: asOfDate,
      mid_rate: latestMid,
      change_pct_vs_previous: changePct,
      range: {
        window_days: 7,
        high: rangeHigh,
        low: rangeLow,
      },
      trend: {
        window_days: 3,
        label: "Range-Bound",
      },
      volatility: {
        window_days: 30,
        avg_daily_move_pct: volatilityAvgDailyMovePct,
      },
    },
    { status: 200, headers: VERSION_HEADERS }
  );
}
