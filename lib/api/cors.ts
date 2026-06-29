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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
