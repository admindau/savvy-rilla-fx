// app/api/v1/rates/latest/route.ts
import { NextRequest } from "next/server";
import { apiError, apiJson } from "@/lib/api/response";
import { apiOptions, withApiProtection } from "@/lib/api/middleware";
import { isCurrencyCode, normalizeCurrencyCode } from "@/lib/api/validation";
import { supabaseServer } from "@/lib/supabase/server";


export const OPTIONS = apiOptions;

type LiveRateRow = {
  as_of_date: string;
  base_currency: string;
  quote_currency: string;
  rate_mid: number | string | null;
  is_official: boolean | null;
  is_manual_override: boolean | null;
  source_id?: number | string | null;
  source_code?: string | null;
  source_label?: string | null;
};

export const GET = withApiProtection(async function GET(req: NextRequest, context) {
  const supabase = supabaseServer;
  const url = new URL(req.url);
  const baseCurrency = normalizeCurrencyCode(url.searchParams.get("base"), "SSP");

  if (!isCurrencyCode(baseCurrency)) {
    return apiError(
      context,
      400,
      "INVALID_CURRENCY",
      "base must be a valid 3-letter currency code."
    );
  }

  const { data: latestDateRow, error: latestDateError } = await supabase
    .from("fx_daily_rates")
    .select("as_of_date")
    .eq("base_currency", baseCurrency)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestDateError) {
    return apiError(context, 500, "DB_ERROR", latestDateError.message);
  }

  let asOfDate = latestDateRow?.as_of_date as string | null;

  let liveRates: LiveRateRow[] = [];
  if (asOfDate) {
    const { data, error } = await supabase
      .from("fx_daily_rates")
      .select(
        "as_of_date, base_currency, quote_currency, rate_mid, is_official, is_manual_override, source_id"
      )
      .eq("base_currency", baseCurrency)
      .eq("as_of_date", asOfDate)
      .order("quote_currency", { ascending: true });

    if (error) {
      return apiError(context, 500, "DB_ERROR", error.message);
    }

    liveRates = (data ?? []) as LiveRateRow[];
  }

  if (!asOfDate || liveRates.length === 0) {
    const { data: defaultDateRow, error: defaultDateError } = await supabase
      .from("fx_daily_rates_default")
      .select("as_of_date")
      .eq("base_currency", baseCurrency)
      .order("as_of_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (defaultDateError) {
      return apiError(context, 500, "DB_ERROR", defaultDateError.message);
    }

    asOfDate = defaultDateRow?.as_of_date as string | null;

    if (!asOfDate) {
      return apiError(
        context,
        404,
        "NO_DATA",
        `No FX data found for base currency ${baseCurrency}.`
      );
    }

    const { data, error } = await supabase
      .from("fx_daily_rates_default")
      .select(
        "as_of_date, base_currency, quote_currency, rate_mid, is_official, is_manual_override, source_code, source_label"
      )
      .eq("base_currency", baseCurrency)
      .eq("as_of_date", asOfDate)
      .order("quote_currency", { ascending: true });

    if (error) {
      return apiError(context, 500, "DB_ERROR", error.message);
    }

    const rates: Record<string, number> = {};
    for (const row of data ?? []) {
      rates[row.quote_currency] = Number(row.rate_mid);
    }

    return apiJson(context, {
      base: baseCurrency,
      as_of_date: asOfDate,
      source: "fx_daily_rates_default",
      rates,
    });
  }

  const rates: Record<string, number> = {};
  for (const row of liveRates) {
    rates[row.quote_currency] = Number(row.rate_mid);
  }

  return apiJson(context, {
    base: baseCurrency,
    as_of_date: asOfDate,
    source: "fx_daily_rates",
    rates,
  });
});
