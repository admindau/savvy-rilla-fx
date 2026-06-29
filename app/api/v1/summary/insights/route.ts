// app/api/v1/summary/insights/route.ts
import { NextRequest } from "next/server";
import { apiCachedJson, ApiRouteError } from "@/lib/api/cache-response";
import { apiError } from "@/lib/api/response";
import { apiOptions, withApiProtection } from "@/lib/api/middleware";
import { isCurrencyCode, normalizeCurrencyCode } from "@/lib/api/validation";
import { CACHE_TAGS } from "@/lib/cache";
import {
  buildAiCommentaryFromSummary,
  buildInsightsFromSummary,
  buildMarketHealthFromSummary,
  type MarketSummary,
} from "@/lib/fx/insights";

export const OPTIONS = apiOptions;

export const dynamic = "force-dynamic";

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_FX_API_ORIGIN) {
    return process.env.NEXT_PUBLIC_FX_API_ORIGIN;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

function isMarketSummary(value: unknown): value is MarketSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<MarketSummary>;
  return Boolean(candidate.base && candidate.quote && candidate.as_of_date);
}

export const GET = withApiProtection(async function GET(req: NextRequest, context) {
  const url = new URL(req.url);
  const base = normalizeCurrencyCode(url.searchParams.get("base"), "SSP");
  const quote = normalizeCurrencyCode(url.searchParams.get("quote"), "USD");

  if (!isCurrencyCode(base) || !isCurrencyCode(quote)) {
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
      namespace: "api:v1:summary:insights",
      ttlSeconds: 60,
      tags: [CACHE_TAGS.summary, CACHE_TAGS.rates],
      varyBy: { base, quote },
    },
    async () => {
      const apiBase = getApiBaseUrl();
      const summaryUrl = `${apiBase}/api/v1/summary/market?base=${encodeURIComponent(
        base
      )}&quote=${encodeURIComponent(quote)}`;

      try {
        const res = await fetch(summaryUrl, { cache: "no-store" });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new ApiRouteError(
            502,
            "SUMMARY_UPSTREAM_ERROR",
            `Upstream /summary/market call failed with ${res.status}`,
            text
          );
        }

        const rawSummary = await res.json();
        const summaryCandidate =
          rawSummary && typeof rawSummary === "object" && "data" in rawSummary
            ? (rawSummary as { data?: unknown }).data
            : rawSummary;

        if (!isMarketSummary(summaryCandidate)) {
          throw new ApiRouteError(
            502,
            "SUMMARY_UPSTREAM_ERROR",
            "Upstream /summary/market returned an invalid summary payload."
          );
        }

        const summary = summaryCandidate;
        const insights = buildInsightsFromSummary(summary);
        const marketHealth = buildMarketHealthFromSummary(summary);
        const commentary = buildAiCommentaryFromSummary(summary, marketHealth);

        return {
          pair: `${summary.quote}/${summary.base}`,
          base: summary.base,
          quote: summary.quote,
          as_of_date: summary.as_of_date,
          insights,
          commentary,
          marketHealth,
          market_health: marketHealth,
          meta: {
            version: "v1",
            source: "/api/v1/summary/market",
          },
        };
      } catch (error: unknown) {
        if (error instanceof ApiRouteError) throw error;
        console.error("[FX] /summary/insights error", error);
        throw new ApiRouteError(500, "SUMMARY_INSIGHTS_ERROR", "Failed to generate FX insights.");
      }
    },
  );
});
