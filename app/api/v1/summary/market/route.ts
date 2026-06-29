// app/api/v1/summary/market/route.ts
import { NextRequest } from "next/server";
import { apiCachedJson, ApiRouteError } from "@/lib/api/cache-response";
import { apiError } from "@/lib/api/response";
import { apiOptions, withApiProtection } from "@/lib/api/middleware";
import { isCurrencyCode, normalizeCurrencyCode } from "@/lib/api/validation";
import { CACHE_TAGS } from "@/lib/cache";
import {
  buildAiCommentaryFromSummary,
  buildMarketHealthFromSummary,
  buildMarketSummaryFromRows,
  type FxRatePoint,
} from "@/lib/fx/insights";
import { supabaseServer } from "@/lib/supabase/server";

export const OPTIONS = apiOptions;

type FxDailyRow = FxRatePoint;

export const GET = withApiProtection(async function GET(req: NextRequest, context) {
  const url = new URL(req.url);

  const baseCurrency = normalizeCurrencyCode(url.searchParams.get("base"), "SSP");
  const quoteCurrency = normalizeCurrencyCode(url.searchParams.get("quote"), "USD");

  if (!isCurrencyCode(baseCurrency) || !isCurrencyCode(quoteCurrency)) {
    return apiError(
      context,
      400,
      "INVALID_CURRENCY",
      "base and quote must be valid 3-letter currency codes."
    );
  }

  return apiCachedJson(
    req,
    context,
    {
      namespace: "api:v1:summary:market",
      ttlSeconds: 60,
      tags: [CACHE_TAGS.summary, CACHE_TAGS.rates],
      varyBy: { base: baseCurrency, quote: quoteCurrency },
    },
    async () => {
      const { data: latestRow, error: latestError } = await supabaseServer
        .from("fx_daily_rates")
        .select("as_of_date, rate_mid")
        .eq("base_currency", baseCurrency)
        .eq("quote_currency", quoteCurrency)
        .order("as_of_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        throw new ApiRouteError(500, "DB_ERROR", latestError.message);
      }

      if (!latestRow) {
        throw new ApiRouteError(
          404,
          "NO_DATA",
          `No FX data for pair ${baseCurrency}/${quoteCurrency}.`
        );
      }

      const { data: prevRow, error: prevError } = await supabaseServer
        .from("fx_daily_rates")
        .select("as_of_date, rate_mid")
        .eq("base_currency", baseCurrency)
        .eq("quote_currency", quoteCurrency)
        .lt("as_of_date", latestRow.as_of_date)
        .order("as_of_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevError) {
        throw new ApiRouteError(500, "DB_ERROR", prevError.message);
      }

      const latestDateObj = new Date(latestRow.as_of_date);
      const from30Date = new Date(latestDateObj);
      from30Date.setDate(from30Date.getDate() - 29);
      const from30Str = from30Date.toISOString().slice(0, 10);

      const { data: historyRows, error: historyError } = await supabaseServer
        .from("fx_daily_rates")
        .select("as_of_date, rate_mid")
        .eq("base_currency", baseCurrency)
        .eq("quote_currency", quoteCurrency)
        .gte("as_of_date", from30Str)
        .lte("as_of_date", latestRow.as_of_date)
        .order("as_of_date", { ascending: true });

      if (historyError) {
        throw new ApiRouteError(500, "DB_ERROR", historyError.message);
      }

      try {
        const summary = buildMarketSummaryFromRows({
          base: baseCurrency,
          quote: quoteCurrency,
          latest: latestRow as FxDailyRow,
          previous: prevRow as FxDailyRow | null,
          history: (historyRows ?? []) as FxDailyRow[],
        });

        const marketHealth = buildMarketHealthFromSummary(summary);
        const commentary = buildAiCommentaryFromSummary(summary, marketHealth);

        return {
          ...summary,
          marketHealth,
          market_health: marketHealth,
          commentary,
        };
      } catch (error) {
        console.error("[FX] /summary/market intelligence error", error);
        throw new ApiRouteError(
          500,
          "BAD_DATA",
          "Unable to calculate market intelligence from FX records."
        );
      }
    },
  );
});
