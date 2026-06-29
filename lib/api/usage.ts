import type { ApiContext } from "./request-id";
import { getDurationMs } from "./headers";
import { supabaseServer } from "@/lib/supabase/server";

export function recordApiUsage(context: ApiContext, status: number): void {
  if (!context.apiKey?.id) return;
  if (process.env.FX_API_USAGE_LOGS === "false") return;

  const payload = {
    api_key_id: context.apiKey.id,
    developer_id: context.apiKey.developerId,
    request_id: context.requestId,
    method: context.method,
    path: context.path,
    status_code: status,
    duration_ms: getDurationMs(context),
    ip_address: context.ip,
    user_agent: context.userAgent,
  };

  void supabaseServer.from("fx_api_usage_logs").insert(payload);
}
