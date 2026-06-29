import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildApiHeaders, type ApiCacheMode } from "./headers";
import { logApiRequest } from "./logger";
import type { ApiContext } from "./request-id";
import { recordApiUsage } from "./usage";
import { etagMatches } from "./etag";

export type ConditionalResponseOptions = {
  etag: string;
  lastModified: Date;
  cache?: ApiCacheMode;
  cacheSeconds?: number;
  headers?: Record<string, string>;
};

export function isNotModified(req: NextRequest, options: ConditionalResponseOptions): boolean {
  const ifNoneMatch = req.headers.get("if-none-match");
  if (etagMatches(ifNoneMatch, options.etag)) {
    return true;
  }

  const ifModifiedSince = req.headers.get("if-modified-since");
  if (!ifModifiedSince) return false;

  const sinceTime = Date.parse(ifModifiedSince);
  if (!Number.isFinite(sinceTime)) return false;

  return options.lastModified.getTime() <= sinceTime;
}

export function apiNotModified(
  context: ApiContext,
  options: ConditionalResponseOptions,
): NextResponse<null> {
  const status = 304;
  logApiRequest(context, status);
  recordApiUsage(context, status);

  return new NextResponse(null, {
    status,
    headers: {
      ...buildApiHeaders(context, {
        cache: options.cache,
        cacheSeconds: options.cacheSeconds,
      }),
      ETag: options.etag,
      "Last-Modified": options.lastModified.toUTCString(),
      Vary: "Accept-Encoding, If-None-Match, If-Modified-Since",
      ...(options.headers ?? {}),
    },
  });
}
