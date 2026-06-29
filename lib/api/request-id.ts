import type { NextRequest } from "next/server";

export type RateLimitInfo = {
  limit: number;
  remaining: number;
  resetAt: number;
  resetSeconds: number;
};

export type ApiKeyContext = {
  id: string;
  developerId: string | null;
  prefix: string;
  name: string | null;
  environment: "test" | "live" | "admin" | string;
  plan: string | null;
  scopes: string[];
  rateLimitPerMinute: number | null;
  dailyQuota: number | null;
  monthlyQuota: number | null;
};

export function getRequestId(req: NextRequest): string {
  const inbound = req.headers.get("x-request-id")?.trim();
  if (inbound) return inbound;

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function createApiContext(req: NextRequest) {
  const url = new URL(req.url);

  return {
    requestId: getRequestId(req),
    startedAt: performance.now(),
    timestamp: new Date().toISOString(),
    version: "v1",
    method: req.method,
    path: url.pathname,
    origin: req.headers.get("origin"),
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent"),
    rateLimit: null as RateLimitInfo | null,
    apiKey: null as ApiKeyContext | null,
    authMode: "public" as "public" | "api_key",
  };
}

export type ApiContext = ReturnType<typeof createApiContext>;
