import { NextRequest } from "next/server";
import { apiError, apiJson } from "@/lib/api/response";
import { apiOptions, withApiProtection } from "@/lib/api/middleware";
import { supabaseServer } from "@/lib/supabase/server";


export const OPTIONS = apiOptions;

export const GET = withApiProtection(async function GET(_req: NextRequest, context) {
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
});
