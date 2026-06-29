import { NextRequest } from "next/server";
import { createApiContext } from "@/lib/api/request-id";
import { apiError, apiJson } from "@/lib/api/response";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const context = createApiContext(req);
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
