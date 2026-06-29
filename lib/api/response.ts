import { NextResponse } from "next/server";
import { buildApiHeaders, getDurationMs, type ApiCacheMode } from "./headers";
import type { ApiContext } from "./request-id";

export type ApiErrorCode =
  | "BAD_DATA"
  | "BAD_REQUEST"
  | "DB_ERROR"
  | "INVALID_CURRENCY"
  | "INVALID_PARAMETER"
  | "MISSING_PARAMETER"
  | "NO_DATA"
  | "SUMMARY_INSIGHTS_ERROR"
  | "SUMMARY_UPSTREAM_ERROR";

export function apiJson<T extends Record<string, unknown>>(
  context: ApiContext,
  payload: T,
  options?: {
    status?: number;
    cache?: ApiCacheMode;
    cacheSeconds?: number;
  }
) {
  const status = options?.status ?? 200;
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
      headers: buildApiHeaders(context, {
        cache: options?.cache,
        cacheSeconds: options?.cacheSeconds,
      }),
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
