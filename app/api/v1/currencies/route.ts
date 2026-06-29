// app/api/v1/currencies/route.ts
import { NextRequest } from "next/server";
import { createApiContext } from "@/lib/api/request-id";
import { apiError, apiJson } from "@/lib/api/response";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const context = createApiContext(req);
  const supabase = supabaseServer;
  const url = new URL(req.url);

  const search = url.searchParams.get("search")?.trim() ?? "";
  const activeParam = url.searchParams.get("active");
  const activeOnly = activeParam === null ? true : activeParam === "true";

  let query = supabase
    .from("currencies")
    .select("code, name, symbol, decimals, created_at", { count: "exact" });

  if (search) {
    query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
  }

  const { data, error, count } = await query.order("code", {
    ascending: true,
  });

  if (error) {
    return apiError(context, 500, "DB_ERROR", error.message);
  }

  return apiJson(context, {
    data: data ?? [],
    meta: { count: count ?? data?.length ?? 0, activeOnly, search },
  });
}
