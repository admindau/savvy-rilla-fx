import { NextResponse, type NextRequest } from "next/server";
import { buildApiHeaders } from "./headers";
import { validateApiKey } from "./api-keys";
import { createApiContext, type ApiContext } from "./request-id";
import { applyRateLimit } from "./rate-limit";

export type RouteContext = Record<string, unknown> | undefined;

export type ApiHandler = (
  req: NextRequest,
  context: ApiContext,
  routeContext?: RouteContext,
) => Promise<Response> | Response;

export function withApiProtection(handler: ApiHandler) {
  return async function protectedHandler(req: NextRequest, routeContext?: RouteContext) {
    const context = createApiContext(req);

    const apiKeyError = await validateApiKey(req, context);
    if (apiKeyError) return apiKeyError;

    const rateLimited = applyRateLimit(req, context);
    if (rateLimited) return rateLimited;

    return handler(req, context, routeContext);
  };
}

export function apiOptions(req: NextRequest) {
  const context = createApiContext(req);
  return new NextResponse(null, {
    status: 204,
    headers: buildApiHeaders(context),
  });
}
