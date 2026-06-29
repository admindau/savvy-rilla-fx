// app/api/v1/summary/market/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  buildMarketSummaryFromRows,
  type FxRatePoint,
} from "@/lib/fx/insights";
import { supabaseServer } from "@/lib/supabase/server";

const VERSION_HEADERS = { "X-FX-API-Version": "v1" };

type FxDailyRow = FxRatePoint;

function badRequest(message: string) {
  return NextResponse.json(
    { error: { code: "BAD_REQUEST", message } },
    { status: 400, headers: VERSION_HEADERS }
  );
}

export async function GET(req: NextRequest) {
  const supabase = supabaseServer;
  const url = new URL(req.url);

  const baseCurrency = (url.searchParams.get("base") ?? "SSP").toUpperCase();
  const quoteCurrency = (url.searchParams.get("quote") ?? "USD").toUpperCase();

  if (!/^[A-Z]{3}$/.test(baseCurrency) || !/^[A-Z]{3}$/.test(quoteCurrency)) {
    return badRequest("base and quote must be valid 3-letter currency codes.");
  }

  // 1) Latest fixing.
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

  // 2) Previous fixing. This is intentionally separate from the 30-day window
  // because sparse market data can place the previous observation outside the
  // calendar window.
  const { data: prevRow, error: prevError } = await supabase
    .from("fx_daily_rates")
    .select("as_of_date, rate_mid")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .lt("as_of_date", latestRow.as_of_date)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevError) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: prevError.message } },
      { status: 500, headers: VERSION_HEADERS }
    );
  }

  // 3) History window. FX-II-01A keeps this as a read-only derived analytics
  // layer: no schema changes, no writes, and no impact on the shared Supabase
  // database used by Gorilla Ledger and EAMU.
  const latestDateObj = new Date(latestRow.as_of_date);
  const from30Date = new Date(latestDateObj);
  from30Date.setDate(from30Date.getDate() - 29); // inclusive 30-day window
  const from30Str = from30Date.toISOString().slice(0, 10);

  const { data: historyRows, error: historyError } = await supabase
    .from("fx_daily_rates")
    .select("as_of_date, rate_mid")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .gte("as_of_date", from30Str)
    .lte("as_of_date", latestRow.as_of_date)
    .order("as_of_date", { ascending: true });

  if (historyError) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: historyError.message } },
      { status: 500, headers: VERSION_HEADERS }
    );
  }

  try {
    const summary = buildMarketSummaryFromRows({
      base: baseCurrency,
      quote: quoteCurrency,
      latest: latestRow as FxDailyRow,
      previous: prevRow as FxDailyRow | null,
      history: (historyRows ?? []) as FxDailyRow[],
    });

    return NextResponse.json(summary, {
      status: 200,
      headers: VERSION_HEADERS,
    });
  } catch (error) {
    console.error("[FX] /summary/market intelligence error", error);
    return NextResponse.json(
      {
        error: {
          code: "BAD_DATA",
          message: "Unable to calculate market intelligence from FX records.",
        },
      },
      { status: 500, headers: VERSION_HEADERS }
    );
  }
}
