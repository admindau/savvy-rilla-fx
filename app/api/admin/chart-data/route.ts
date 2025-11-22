// app/api/admin/chart-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const VERSION_HEADERS = { "X-FX-API-Version": "admin-v1" };

type FxChartPoint = {
  date: string;
  rateMid: number;
};

type ChartDataResponse = {
  base: string;
  quote: string;
  points: FxChartPoint[];
  meta: {
    from: string | null;
    to: string | null;
    count: number;
  };
};

export async function GET(req: NextRequest) {
  const supabase = supabaseServer;
  const url = new URL(req.url);

  const baseCurrency = (url.searchParams.get("base") ?? "SSP").toUpperCase();
  const quoteCurrency = (url.searchParams.get("quote") ?? "USD").toUpperCase();

  // Optional: limit of rows (for safety). If not provided, use 2000.
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) || 2000 : 2000;

  // Optional: days window (e.g. ?days=365)
  const daysParam = url.searchParams.get("days");
  const days = daysParam ? Number(daysParam) : null;

  let query = supabase
    .from("fx_daily_rates")
    .select("as_of_date, rate_mid")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .order("as_of_date", { ascending: true });

  // If a days window is provided, only include rows from today - days
  if (days && days > 0) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromStr = fromDate.toISOString().slice(0, 10);
    query = query.gte("as_of_date", fromStr);
  }

  // Apply a row limit for safety
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error("Error loading admin chart data:", error.message);
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500, headers: VERSION_HEADERS }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json<ChartDataResponse>(
      {
        base: baseCurrency,
        quote: quoteCurrency,
        points: [],
        meta: { from: null, to: null, count: 0 },
      },
      { status: 200, headers: VERSION_HEADERS }
    );
  }

  // Map rows into the shape the admin chart expects
  const points: FxChartPoint[] = data.map((row: any) => ({
    date: row.as_of_date as string,
    rateMid: Number(row.rate_mid),
  }));

  const from = points[0]?.date ?? null;
  const to = points[points.length - 1]?.date ?? null;

  const response: ChartDataResponse = {
    base: baseCurrency,
    quote: quoteCurrency,
    points,
    meta: {
      from,
      to,
      count: points.length,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: VERSION_HEADERS,
  });
}
