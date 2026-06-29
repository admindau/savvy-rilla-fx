import type { ApiContext } from "./request-id";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://fx.savvyrilla.tech",
  "http://localhost:3000",
];

function getAllowedOrigins(): string[] {
  const configured = process.env.FX_API_ALLOWED_ORIGINS;
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getCorsOrigin(context: ApiContext): string | null {
  const origin = context.origin;
  if (!origin) return null;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes("*")) return origin;
  if (allowedOrigins.includes(origin)) return origin;

  return null;
}

export function buildCorsHeaders(context: ApiContext): Record<string, string> {
  const allowedOrigin = getCorsOrigin(context);

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key, X-Request-ID",
    "Access-Control-Expose-Headers":
      "X-API-Version, X-FX-API-Version, X-Request-ID, X-Response-Time, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
