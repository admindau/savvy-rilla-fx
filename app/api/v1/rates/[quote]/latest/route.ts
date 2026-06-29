// app/api/v1/rates/[quote]/latest/route.ts
import { NextRequest } from "next/server";
import { apiError, apiJson } from "@/lib/api/response";
import { apiOptions, withApiProtection, type RouteContext } from "@/lib/api/middleware";
import { isCurrencyCode, normalizeCurrencyCode } from "@/lib/api/validation";
import { supabaseServer } from "@/lib/supabase/server";


export const OPTIONS = apiOptions;

export const GET = withApiProtection(async function GET(
  req: NextRequest,
  context,
  routeContext?: RouteContext,
) {
  const supabase = supabaseServer;
  const url = new URL(req.url);
  const baseCurrency = normalizeCurrencyCode(url.searchParams.get("base"), "SSP");

  const params = routeContext?.params as Promise<{ quote: string }> | { quote: string } | undefined;
  const { quote } = params ? await params : { quote: "USD" };
  const quoteCurrency = normalizeCurrencyCode(quote, "USD");

  if (!isCurrencyCode(baseCurrency) || !isCurrencyCode(quoteCurrency)) {
    return apiError(
      context,
      400,
      "INVALID_CURRENCY",
      "base and quote must be valid 3-letter currency codes."
    );
  }

  const { data: latestRow, error } = await supabase
    .from("fx_daily_rates")
    .select(
      "as_of_date, base_currency, quote_currency, rate_mid, is_official, is_manual_override, source_id"
    )
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return apiError(context, 500, "DB_ERROR", error.message);
  }

  if (!latestRow) {
    return apiError(
      context,
      404,
      "NO_DATA",
      `No FX data found for pair ${baseCurrency}/${quoteCurrency}.`
    );
  }

  const { data: prevRow } = await supabase
    .from("fx_daily_rates")
    .select("rate_mid, as_of_date")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .lt("as_of_date", latestRow.as_of_date)
    .order("as_of_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestMid = Number(latestRow.rate_mid);
  const prevMid = prevRow ? Number(prevRow.rate_mid) : null;

  let changePct: number | null = null;
  if (prevMid && prevMid !== 0) {
    changePct = ((latestMid - prevMid) / prevMid) * 100;
  }

  return apiJson(context, {
    pair: `${baseCurrency}/${quoteCurrency}`,
    base: baseCurrency,
    quote: quoteCurrency,
    as_of_date: latestRow.as_of_date,
    mid_rate: latestMid,
    change_pct_vs_previous: changePct,
    is_official: latestRow.is_official,
    is_manual_override: latestRow.is_manual_override,
    source_id: latestRow.source_id,
  });
});
