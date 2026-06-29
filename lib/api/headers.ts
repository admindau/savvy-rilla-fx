import { buildCorsHeaders } from "./cors";
import type { ApiContext } from "./request-id";
import { buildSecurityHeaders } from "./security";

export type ApiCacheMode = "no-store" | "public" | "private";

export function getDurationMs(context: ApiContext): number {
  return Math.max(0, Math.round(performance.now() - context.startedAt));
}

export function buildApiHeaders(
  context: ApiContext,
  options?: {
    contentType?: string;
    cache?: ApiCacheMode;
    cacheSeconds?: number;
  },
): Record<string, string> {
  const durationMs = getDurationMs(context);
  const cache = options?.cache ?? "no-store";
  const cacheSeconds = options?.cacheSeconds ?? 60;

  const cacheControl =
    cache === "public"
      ? `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`
      : cache === "private"
        ? `private, max-age=${cacheSeconds}`
        : "no-store";

  const headers: Record<string, string> = {
    ...buildCorsHeaders(context),
    ...buildSecurityHeaders(),
    "Cache-Control": cacheControl,
    "X-API-Version": context.version,
    "X-FX-API-Version": context.version,
    "X-Request-ID": context.requestId,
    "X-Response-Time": `${durationMs}ms`,
  };

  if (context.rateLimit) {
    headers["X-RateLimit-Limit"] = String(context.rateLimit.limit);
    headers["X-RateLimit-Remaining"] = String(context.rateLimit.remaining);
    headers["X-RateLimit-Reset"] = String(Math.ceil(context.rateLimit.resetAt / 1000));
  }

  if (options?.contentType) {
    headers["Content-Type"] = options.contentType;
  }

  return headers;
}
