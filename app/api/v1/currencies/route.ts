// app/api/v1/currencies/route.ts
import { NextRequest } from "next/server";
import { apiCachedJson, ApiRouteError } from "@/lib/api/cache-response";
import { apiOptions, withApiProtection } from "@/lib/api/middleware";
import { CACHE_TAGS } from "@/lib/cache";
import { supabaseServer } from "@/lib/supabase/server";

export const OPTIONS = apiOptions;

export const GET = withApiProtection(async function GET(req: NextRequest, context) {
  const url = new URL(req.url);

  const search = url.searchParams.get("search")?.trim() ?? "";
  const activeParam = url.searchParams.get("active");
  const activeOnly = activeParam === null ? true : activeParam === "true";

  return apiCachedJson(
    req,
    context,
    {
      namespace: "api:v1:currencies",
      ttlSeconds: 86_400,
      tags: [CACHE_TAGS.currencies],
    },
    async () => {
      let query = supabaseServer
        .from("currencies")
        .select("code, name, symbol, decimals, created_at", { count: "exact" });

      if (search) {
        query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
      }

      const { data, error, count } = await query.order("code", {
        ascending: true,
      });

      if (error) {
        throw new ApiRouteError(500, "DB_ERROR", error.message);
      }

      return {
        data: data ?? [],
        meta: { count: count ?? data?.length ?? 0, activeOnly, search },
      };
    },
  );
});
