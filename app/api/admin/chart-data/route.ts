// app/api/admin/chart-data/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const quote = (url.searchParams.get("quote") || "USD").toUpperCase();
    const limitParam = url.searchParams.get("limit");
    const limit = Number(limitParam || "365");

    const { data, error } = await supabaseServer
      .from("fx_daily_rates")
      .select("as_of_date, rate_mid")
      .eq("base_currency", "SSP")
      .eq("quote_currency", quote)
      .order("as_of_date", { ascending: true })
      .limit(Number.isNaN(limit) ? 365 : limit);

    if (error) {
      console.error("Error loading FX chart data:", error);
      return NextResponse.json(
        { error: "Failed to load FX chart data", details: error.message },
        { status: 500 }
      );
    }

    const points =
      data?.map((row: any) => ({
        date: row.as_of_date as string,
        rateMid: row.rate_mid as number,
      })) ?? [];

    return NextResponse.json(
      {
        currency: quote,
        base: "SSP",
        points,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error loading FX chart data:", err);
    return NextResponse.json(
      {
        error: "Unexpected error while loading FX chart data",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
