import { NextResponse, type NextRequest } from "next/server";
import { buildApiHeaders } from "./headers";
import { createApiContext, type ApiContext } from "./request-id";
import { applyRateLimit } from "./rate-limit";

export type ApiHandler = (req: NextRequest, context: ApiContext) => Promise<Response> | Response;

export function withApiProtection(handler: ApiHandler) {
  return async function protectedHandler(req: NextRequest) {
    const context = createApiContext(req);
    const rateLimited = applyRateLimit(req, context);
    if (rateLimited) return rateLimited;
    return handler(req, context);
  };
}

export function apiOptions(req: NextRequest) {
  const context = createApiContext(req);
  return new NextResponse(null, {
    status: 204,
    headers: buildApiHeaders(context),
  });
}
