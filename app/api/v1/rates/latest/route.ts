import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const base = searchParams.get("base") ?? "SSP";
  const quotesParam = searchParams.get("quotes") ?? "USD";
  const quotes = quotesParam.split(",").map((q) => q.trim().toUpperCase());

  try {
    const { data, error } = await supabaseServer
      .from("fx_daily_rates_default")
      .select("*")
      .eq("base_currency", base.toUpperCase())
      .in("quote_currency", quotes)
      .order("as_of_date", { ascending: false });

    if (error) {
      throw error;
    }

    const latestDate = data?.[0]?.as_of_date ?? null;
    const rates: Record<string, number> = {};

    for (const row of data ?? []) {
      if (!(row.quote_currency in rates)) {
        rates[row.quote_currency] = Number(row.rate_mid);
      }
    }

    return NextResponse.json(
      {
        base: base.toUpperCase(),
        as_of_date: latestDate,
        rates,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch latest FX rates",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
