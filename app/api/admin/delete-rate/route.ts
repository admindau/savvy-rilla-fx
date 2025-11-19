// app/api/admin/delete-rate/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const id = body?.id;
    if (!id || typeof id !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid id in request body" },
        { status: 400 }
      );
    }

    const supabase = supabaseServer;

    const { error } = await supabase
      .from("fx_daily_rates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting FX rate:", error);
      return NextResponse.json(
        { error: "Failed to delete FX rate", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "FX rate deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error in delete-rate:", err);
    return NextResponse.json(
      {
        error: "Unexpected error while deleting FX rate",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
