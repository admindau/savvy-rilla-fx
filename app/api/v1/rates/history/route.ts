import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const base = (searchParams.get("base") ?? "SSP").toUpperCase();
  const quote = (searchParams.get("quote") ?? "USD").toUpperCase();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "`from` and `to` query params are required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabaseServer
      .from("fx_daily_rates_default")
      .select("as_of_date, rate_mid")
      .eq("base_currency", base)
      .eq("quote_currency", quote)
      .gte("as_of_date", from)
      .lte("as_of_date", to)
      .order("as_of_date", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        base,
        quote,
        from,
        to,
        points: (data ?? []).map((row) => ({
          date: row.as_of_date,
          rate: Number(row.rate_mid),
        })),
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch FX history",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
