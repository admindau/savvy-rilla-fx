// app/api/v1/summary/insights/route.ts
import { NextRequest } from "next/server";
import { createApiContext } from "@/lib/api/request-id";
import { apiError, apiJson } from "@/lib/api/response";
import { apiOptions } from "@/lib/api/middleware";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { isCurrencyCode, normalizeCurrencyCode } from "@/lib/api/validation";
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

export async function GET(req: NextRequest) {
  const context = createApiContext(req);
  const rateLimited = applyRateLimit(req, context);
  if (rateLimited) return rateLimited;
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

  const apiBase = getApiBaseUrl();
  const summaryUrl = `${apiBase}/api/v1/summary/market?base=${encodeURIComponent(
    base
  )}&quote=${encodeURIComponent(quote)}`;

  try {
    const res = await fetch(summaryUrl, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return apiError(
        context,
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
      return apiError(
        context,
        502,
        "SUMMARY_UPSTREAM_ERROR",
        "Upstream /summary/market returned an invalid summary payload."
      );
    }

    const summary = summaryCandidate;
    const insights = buildInsightsFromSummary(summary);
    const marketHealth = buildMarketHealthFromSummary(summary);
    const commentary = buildAiCommentaryFromSummary(summary, marketHealth);

    return apiJson(context, {
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
    });
  } catch (error: unknown) {
    console.error("[FX] /summary/insights error", error);
    return apiError(context, 500, "SUMMARY_INSIGHTS_ERROR", "Failed to generate FX insights.");
  }
}
