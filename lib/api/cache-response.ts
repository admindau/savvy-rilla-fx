import type { NextRequest } from "next/server";
import { buildCacheKey, cacheManager, type CacheTag } from "@/lib/cache";
import type { ApiContext } from "./request-id";
import { apiNotModified, isNotModified } from "./conditional";
import { generateEtag } from "./etag";
import { apiError, apiJson, type ApiErrorCode } from "./response";

export class ApiRouteError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ApiCachedJsonOptions = {
  namespace: string;
  ttlSeconds: number;
  tags: CacheTag[];
  varyBy?: Record<string, string | number | boolean | null | undefined>;
};

function getCacheStatusHeaders(input: {
  cacheKey: string;
  hit: boolean;
  ageMs: number;
  expiresAt: number | null;
  ttlSeconds: number;
  etag: string;
  lastModified: Date;
}): Record<string, string> {
  const remainingMs = input.expiresAt === null ? 0 : Math.max(0, input.expiresAt - Date.now());
  const expiresAt = input.expiresAt === null ? null : new Date(input.expiresAt);

  return {
    "X-Cache": input.hit ? "HIT" : "MISS",
    "X-Cache-Key": input.cacheKey,
    "X-Cache-TTL": String(input.ttlSeconds),
    "X-Cache-Age": String(Math.floor(input.ageMs / 1000)),
    "X-Cache-Remaining": String(Math.ceil(remainingMs / 1000)),
    Age: String(Math.floor(input.ageMs / 1000)),
    Expires: expiresAt?.toUTCString() ?? new Date(Date.now() + input.ttlSeconds * 1000).toUTCString(),
    ETag: input.etag,
    "Last-Modified": input.lastModified.toUTCString(),
    Vary: "Accept-Encoding, If-None-Match, If-Modified-Since",
  };
}

export async function apiCachedJson<T extends Record<string, unknown>>(
  req: NextRequest,
  context: ApiContext,
  options: ApiCachedJsonOptions,
  loader: () => Promise<T>,
) {
  const url = new URL(req.url);
  const cacheKey = buildCacheKey({
    namespace: options.namespace,
    path: url.pathname,
    searchParams: url.searchParams,
    varyBy: options.varyBy,
  });

  try {
    const result = await cacheManager.remember<T>(
      cacheKey,
      {
        ttlMs: options.ttlSeconds * 1000,
        tags: options.tags,
      },
      loader,
    );

    if (!result.value) {
      throw new ApiRouteError(500, "BAD_DATA", "Cached API loader returned an empty payload.");
    }

    const etag = generateEtag(result.value);
    const lastModified = new Date(Date.now() - result.ageMs);
    const cacheHeaders = getCacheStatusHeaders({
      cacheKey,
      hit: result.hit,
      ageMs: result.ageMs,
      expiresAt: result.expiresAt,
      ttlSeconds: options.ttlSeconds,
      etag,
      lastModified,
    });

    if (isNotModified(req, {
      etag,
      lastModified,
      cache: "public",
      cacheSeconds: options.ttlSeconds,
      headers: cacheHeaders,
    })) {
      return apiNotModified(context, {
        etag,
        lastModified,
        cache: "public",
        cacheSeconds: options.ttlSeconds,
        headers: cacheHeaders,
      });
    }

    return apiJson(context, result.value, {
      cache: "public",
      cacheSeconds: options.ttlSeconds,
      etag,
      lastModified,
      headers: cacheHeaders,
    });
  } catch (error) {
    if (error instanceof ApiRouteError) {
      return apiError(context, error.status, error.code, error.message, error.details);
    }

    const message = error instanceof Error ? error.message : "Unexpected cache loader error.";
    return apiError(context, 500, "DB_ERROR", message);
  }
}
