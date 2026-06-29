// app/api/v1/export/rates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buildApiHeaders } from "@/lib/api/headers";
import { createApiContext } from "@/lib/api/request-id";
import { apiError, apiJson } from "@/lib/api/response";
import { apiOptions } from "@/lib/api/middleware";
import { applyRateLimit } from "@/lib/api/rate-limit";
import {
  isCurrencyCode,
  isIsoDate,
  normalizeCurrencyCode,
} from "@/lib/api/validation";
import { supabaseServer } from "@/lib/supabase/server";


export const OPTIONS = apiOptions;

export async function GET(req: NextRequest) {
  const context = createApiContext(req);
  const rateLimited = applyRateLimit(req, context);
  if (rateLimited) return rateLimited;
  const supabase = supabaseServer;
  const url = new URL(req.url);

  const baseCurrency = normalizeCurrencyCode(url.searchParams.get("base"), "SSP");
  const quoteCurrency = url.searchParams.get("quote")
    ? normalizeCurrencyCode(url.searchParams.get("quote"), "")
    : null;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  if (!isCurrencyCode(baseCurrency)) {
    return apiError(context, 400, "INVALID_CURRENCY", "base must be a valid 3-letter currency code.");
  }

  if (quoteCurrency && !isCurrencyCode(quoteCurrency)) {
    return apiError(context, 400, "INVALID_CURRENCY", "quote must be a valid 3-letter currency code.");
  }

  if (!from || !to) {
    return apiError(context, 400, "MISSING_PARAMETER", "from and to (YYYY-MM-DD) are required.");
  }

  if (!isIsoDate(from) || !isIsoDate(to)) {
    return apiError(context, 400, "INVALID_PARAMETER", "from and to must be valid dates in YYYY-MM-DD format.");
  }

  if (from > to) {
    return apiError(context, 400, "INVALID_PARAMETER", "from must be before or equal to to.");
  }

  if (!format || !["csv", "json"].includes(format)) {
    return apiError(context, 400, "INVALID_PARAMETER", "format must be either csv or json.");
  }

  let query = supabase
    .from("fx_daily_rates")
    .select(
      "as_of_date, base_currency, quote_currency, rate_mid, is_official, is_manual_override, source_id"
    )
    .eq("base_currency", baseCurrency)
    .gte("as_of_date", from)
    .lte("as_of_date", to)
    .order("as_of_date", { ascending: true })
    .order("quote_currency", { ascending: true });

  if (quoteCurrency) {
    query = query.eq("quote_currency", quoteCurrency);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(context, 500, "DB_ERROR", error.message);
  }

  if (format === "json") {
    return apiJson(context, {
      data: data ?? [],
      meta: { base: baseCurrency, quote: quoteCurrency, from, to },
    });
  }

  const rows = data ?? [];
  const header = [
    "as_of_date",
    "base_currency",
    "quote_currency",
    "rate_mid",
    "is_official",
    "is_manual_override",
    "source_id",
  ];

  const csvLines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.as_of_date,
        row.base_currency,
        row.quote_currency,
        row.rate_mid,
        row.is_official,
        row.is_manual_override,
        row.source_id,
      ]
        .map((value) =>
          value === null || value === undefined ? "" : String(value)
        )
        .join(",")
    ),
  ];

  const csv = csvLines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      ...buildApiHeaders(context, { contentType: "text/csv; charset=utf-8" }),
      "Content-Disposition": `attachment; filename="fx_rates_${baseCurrency}_${from}_to_${to}.csv"`,
    },
  });
}
