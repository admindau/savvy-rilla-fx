import { NextRequest } from "next/server";
import { createApiContext } from "@/lib/api/request-id";
import { apiError, apiJson } from "@/lib/api/response";
import { apiOptions } from "@/lib/api/middleware";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { supabaseServer } from "@/lib/supabase/server";


export const OPTIONS = apiOptions;

export async function GET(req: NextRequest) {
  const context = createApiContext(req);
  const rateLimited = applyRateLimit(req, context);
  if (rateLimited) return rateLimited;
  const startedAt = process.uptime();

  const { data, error } = await supabaseServer
    .from("currencies")
    .select("code")
    .limit(1);

  if (error) {
    return apiError(
      context,
      500,
      "DB_ERROR",
      "Database health check failed.",
      error.message
    );
  }

  return apiJson(context, {
    status: "healthy",
    db: Boolean(data),
    database: {
      status: "connected",
      checkedTable: "currencies",
    },
    service: "Savvy Rilla FX API",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    uptimeSeconds: Math.round(startedAt),
  });
}
