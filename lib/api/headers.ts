import type { ApiContext } from "./request-id";

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
  }
): HeadersInit {
  const durationMs = getDurationMs(context);
  const cache = options?.cache ?? "no-store";
  const cacheSeconds = options?.cacheSeconds ?? 60;

  const cacheControl =
    cache === "public"
      ? `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`
      : cache === "private"
        ? `private, max-age=${cacheSeconds}`
        : "no-store";

  return {
    "Cache-Control": cacheControl,
    "Referrer-Policy": "no-referrer",
    "X-API-Version": context.version,
    "X-Content-Type-Options": "nosniff",
    "X-FX-API-Version": context.version,
    "X-Frame-Options": "DENY",
    "X-Request-ID": context.requestId,
    "X-Response-Time": `${durationMs}ms`,
    ...(options?.contentType ? { "Content-Type": options.contentType } : {}),
  };
}
