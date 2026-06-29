import type { NextRequest } from "next/server";

export function getRequestId(req: NextRequest): string {
  const inbound = req.headers.get("x-request-id")?.trim();
  if (inbound) return inbound;

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createApiContext(req: NextRequest) {
  return {
    requestId: getRequestId(req),
    startedAt: performance.now(),
    timestamp: new Date().toISOString(),
    version: "v1",
  };
}

export type ApiContext = ReturnType<typeof createApiContext>;
