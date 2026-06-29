import type { ApiContext } from "./request-id";
import { getDurationMs } from "./headers";

export function logApiRequest(context: ApiContext, status: number): void {
  if (process.env.NODE_ENV === "test") return;

  const payload = {
    event: "fx_api_request",
    method: context.method,
    path: context.path,
    status,
    durationMs: getDurationMs(context),
    requestId: context.requestId,
    ip: context.ip,
  };

  if (status >= 500) {
    console.error(JSON.stringify(payload));
    return;
  }

  if (process.env.FX_API_REQUEST_LOGS === "true") {
    console.info(JSON.stringify(payload));
  }
}
