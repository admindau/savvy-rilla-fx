import { NextResponse } from "next/server";
import { buildApiHeaders, getDurationMs, type ApiCacheMode } from "./headers";
import { logApiRequest } from "./logger";
import { recordApiUsage } from "./usage";
import type { ApiContext } from "./request-id";

export type ApiErrorCode =
  | "BAD_DATA"
  | "API_KEY_EXPIRED"
  | "API_KEY_LOOKUP_FAILED"
  | "API_KEY_REQUIRED"
  | "API_KEY_REVOKED"
  | "BAD_REQUEST"
  | "DEVELOPER_DISABLED"
  | "DB_ERROR"
  | "INVALID_API_KEY"
  | "INVALID_CURRENCY"
  | "INVALID_PARAMETER"
  | "MISSING_PARAMETER"
  | "NO_DATA"
  | "RATE_LIMITED"
  | "SUMMARY_INSIGHTS_ERROR"
  | "SUMMARY_UPSTREAM_ERROR";

export function apiJson<T extends Record<string, unknown>>(
  context: ApiContext,
  payload: T,
  options?: {
    status?: number;
    cache?: ApiCacheMode;
    cacheSeconds?: number;
    headers?: Record<string, string>;
    etag?: string;
    lastModified?: Date | string;
  }
) {
  const status = options?.status ?? 200;
  logApiRequest(context, status);
  recordApiUsage(context, status);

  return NextResponse.json(
    {
      success: true,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      version: context.version,
      durationMs: getDurationMs(context),
      ...payload,
    },
    {
      status,
      headers: {
        ...buildApiHeaders(context, {
          cache: options?.cache,
          cacheSeconds: options?.cacheSeconds,
        }),
        ...(options?.etag ? { ETag: options.etag } : {}),
        ...(options?.lastModified
          ? {
              "Last-Modified":
                options.lastModified instanceof Date
                  ? options.lastModified.toUTCString()
                  : options.lastModified,
            }
          : {}),
        ...(options?.headers ?? {}),
      },
    }
  );
}

export function apiError(
  context: ApiContext,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown
) {
  logApiRequest(context, status);
  recordApiUsage(context, status);

  return NextResponse.json(
    {
      success: false,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      version: context.version,
      durationMs: getDurationMs(context),
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    {
      status,
      headers: buildApiHeaders(context),
    }
  );
}
