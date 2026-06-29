// app/api/v1/rates/recent/route.ts
import { NextRequest } from "next/server";
import { createApiContext } from "@/lib/api/request-id";
import { apiError, apiJson } from "@/lib/api/response";
import {
  isCurrencyCode,
  normalizeCurrencyCode,
  parsePositiveInteger,
} from "@/lib/api/validation";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const context = createApiContext(req);
  const supabase = supabaseServer;
  const url = new URL(req.url);

  const baseCurrency = normalizeCurrencyCode(url.searchParams.get("base"), "SSP");
  const quoteFilter = url.searchParams.get("quote")
    ? normalizeCurrencyCode(url.searchParams.get("quote"), "")
    : null;
  const limit = parsePositiveInteger(url.searchParams.get("limit"), 20, {
    min: 1,
    max: 100,
  });

  if (!isCurrencyCode(baseCurrency)) {
    return apiError(context, 400, "INVALID_CURRENCY", "base must be a valid 3-letter currency code.");
  }

  if (quoteFilter && !isCurrencyCode(quoteFilter)) {
    return apiError(context, 400, "INVALID_CURRENCY", "quote must be a valid 3-letter currency code.");
  }

  let query = supabase
    .from("fx_daily_rates")
    .select(
      "id, as_of_date, base_currency, quote_currency, rate_mid, is_official, is_manual_override, source_id"
    )
    .eq("base_currency", baseCurrency)
    .order("as_of_date", { ascending: false })
    .order("quote_currency", { ascending: true })
    .limit(limit);

  if (quoteFilter) {
    query = query.eq("quote_currency", quoteFilter);
  }

  const { data, error } = await query;

  if (error) {
    return apiError(context, 500, "DB_ERROR", error.message);
  }

  return apiJson(context, {
    data: data ?? [],
    meta: { limit, base: baseCurrency, quote: quoteFilter },
  });
}
