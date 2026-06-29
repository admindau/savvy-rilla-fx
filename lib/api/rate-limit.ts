import { NextResponse, type NextRequest } from "next/server";
import { buildApiHeaders, getDurationMs } from "./headers";
import type { ApiContext, RateLimitInfo } from "./request-id";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const DEFAULT_LIMIT = 120;
const DEFAULT_WINDOW_MS = 60_000;

function getLimit(): number {
  const parsed = Number.parseInt(process.env.FX_API_RATE_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LIMIT;
}

function getWindowMs(): number {
  const parsed = Number.parseInt(process.env.FX_API_RATE_LIMIT_WINDOW_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WINDOW_MS;
}

function getRateLimitKey(req: NextRequest, context: ApiContext): string {
  const apiKey = req.headers.get("x-api-key")?.trim();
  if (apiKey) return `key:${apiKey}`;
  return `ip:${context.ip ?? "unknown"}`;
}

function pruneExpiredBuckets(now: number): void {
  if (buckets.size < 1000) return;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function applyRateLimit(req: NextRequest, context: ApiContext): NextResponse | null {
  const limit = getLimit();
  const windowMs = getWindowMs();
  const now = Date.now();
  const key = getRateLimitKey(req, context);

  pruneExpiredBuckets(now);

  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };

  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, limit - bucket.count);
  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  const rateLimit: RateLimitInfo = {
    limit,
    remaining,
    resetAt: bucket.resetAt,
    resetSeconds,
  };

  context.rateLimit = rateLimit;

  if (bucket.count <= limit) return null;

  return NextResponse.json(
    {
      success: false,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      version: context.version,
      durationMs: getDurationMs(context),
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please retry after the rate limit window resets.",
      },
    },
    {
      status: 429,
      headers: {
        ...buildApiHeaders(context),
        "Retry-After": String(resetSeconds),
      },
    }
  );
}
