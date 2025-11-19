// app/api/admin/recent-rates/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("ExchangeRates") // 🔁 If your table name is different, update this string.
      .select("id, asOfDate, quoteCurrency, rateMid, isOfficial, created_at")
      .order("asOfDate", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading recent FX rates:", error);
      return NextResponse.json(
        { error: "Failed to load recent FX rates", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("Unexpected error loading recent FX rates:", err);
    return NextResponse.json(
      {
        error: "Unexpected error while loading recent FX rates",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
