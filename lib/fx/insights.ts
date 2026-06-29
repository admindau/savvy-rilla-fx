// lib/fx/insights.ts

export type MarketSummary = {
  base: string; // e.g. "SSP"
  quote: string; // e.g. "USD"
  as_of_date: string;
  mid_rate: number;
  change_pct_vs_previous: number | null;
  range: {
    window_days: number;
    high: number;
    low: number;
  };
  trend: {
    window_days: number;
    label: string | null;
  };
  volatility: {
    window_days: number;
    avg_daily_move_pct: number | null;
  };
};

export type MarketHealth = {
  score: number;
  label: "Stable" | "Watch" | "Volatile" | "Thin Data";
  tone: "positive" | "neutral" | "warning";
  drivers: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPair(summary: MarketSummary) {
  // For SSP markets we want "USD/SSP" style
  return `${summary.quote}/${summary.base}`;
}

function formatPct(value: number, digits = 2) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function classifyVolatility(avgDailyMovePct: number | null) {
  if (avgDailyMovePct === null || Number.isNaN(avgDailyMovePct)) {
    return "unknown" as const;
  }

  const vol = Math.abs(avgDailyMovePct);
  if (vol < 0.1) return "very low" as const;
  if (vol < 0.3) return "low" as const;
  if (vol < 0.7) return "elevated" as const;
  return "high" as const;
}

export function buildMarketHealthFromSummary(
  summary: MarketSummary | null
): MarketHealth {
  if (!summary || !summary.mid_rate || summary.mid_rate <= 0) {
    return {
      score: 50,
      label: "Thin Data",
      tone: "neutral",
      drivers: [
        "Not enough market data is available to calculate a confident signal.",
      ],
    };
  }

  const drivers: string[] = [];
  let score = 82;

  const dailyChange = summary.change_pct_vs_previous;
  if (dailyChange === null || Number.isNaN(dailyChange)) {
    score -= 8;
    drivers.push("Previous-day movement is not yet available.");
  } else {
    const absDaily = Math.abs(dailyChange);
    if (absDaily < 0.1) {
      score += 4;
      drivers.push("Daily movement is minimal, supporting a stable reading.");
    } else if (absDaily < 0.5) {
      score -= 3;
      drivers.push("Daily movement is moderate and worth monitoring.");
    } else {
      score -= 12;
      drivers.push("Daily movement is elevated versus the previous fixing.");
    }
  }

  const rangeHigh = summary.range?.high ?? 0;
  const rangeLow = summary.range?.low ?? 0;
  if (rangeHigh > 0 && rangeLow > 0 && rangeHigh >= rangeLow) {
    const rangePct = ((rangeHigh - rangeLow) / summary.mid_rate) * 100;
    if (rangePct < 1) {
      score += 6;
      drivers.push("The recent trading range remains tight.");
    } else if (rangePct < 3) {
      score -= 2;
      drivers.push("The recent trading range is moderate.");
    } else {
      score -= 10;
      drivers.push("The recent trading range is wide for this market.");
    }
  } else {
    score -= 6;
    drivers.push("Range data is incomplete for the selected window.");
  }

  const volatilityLabel = classifyVolatility(
    summary.volatility?.avg_daily_move_pct ?? null
  );
  if (volatilityLabel === "very low" || volatilityLabel === "low") {
    score += 5;
    drivers.push(`Average daily volatility is ${volatilityLabel}.`);
  } else if (volatilityLabel === "elevated") {
    score -= 8;
    drivers.push("Average daily volatility is elevated.");
  } else if (volatilityLabel === "high") {
    score -= 16;
    drivers.push("Average daily volatility is high.");
  } else {
    score -= 5;
    drivers.push("Volatility data is not yet available.");
  }

  const trendLabel = summary.trend?.label ?? "Range-Bound";
  if (trendLabel.toLowerCase().includes("range")) {
    score += 3;
    drivers.push("Trend signal remains range-bound.");
  } else {
    score -= 4;
    drivers.push(`Trend signal currently reads ${trendLabel}.`);
  }

  const finalScore = Math.round(clamp(score, 0, 100));

  if (finalScore >= 75) {
    return {
      score: finalScore,
      label: "Stable",
      tone: "positive",
      drivers: drivers.slice(0, 3),
    };
  }

  if (finalScore >= 55) {
    return {
      score: finalScore,
      label: "Watch",
      tone: "neutral",
      drivers: drivers.slice(0, 3),
    };
  }

  return {
    score: finalScore,
    label: "Volatile",
    tone: "warning",
    drivers: drivers.slice(0, 3),
  };
}

export function buildInsightsFromSummary(summary: MarketSummary): string[] {
  const insights: string[] = [];
  const pairLabel = formatPair(summary);

  // 1) Change vs previous fixing
  if (summary.change_pct_vs_previous !== null) {
    const delta = summary.change_pct_vs_previous;
    const absDelta = Math.abs(delta);

    let descriptor: string;
    if (absDelta < 0.15) {
      descriptor = "has been stable";
    } else if (absDelta < 0.75) {
      descriptor = "has moved moderately";
    } else {
      descriptor = "has moved sharply";
    }

    insights.push(
      `${pairLabel} ${descriptor} vs the previous fixing (${formatPct(
        delta
      )}).`
    );
  }

  // 2) 30-day (or window) range
  const { high, low, window_days: rangeWindow } = summary.range;
  if (summary.mid_rate > 0 && high > 0 && low > 0 && high >= low) {
    const rangePct = ((high - low) / summary.mid_rate) * 100;

    let descriptor: string;
    if (rangePct < 1) {
      descriptor = "tight";
    } else if (rangePct < 3) {
      descriptor = "moderate";
    } else {
      descriptor = "wide";
    }

    insights.push(
      `${pairLabel} ${rangeWindow}-day trading range is ${descriptor}: ` +
        `${low.toFixed(2)} – ${high.toFixed(2)}.`
    );
  }

  // 3) Volatility
  const { avg_daily_move_pct, window_days: volWindow } = summary.volatility;
  if (avg_daily_move_pct !== null) {
    const volatilityLabel = classifyVolatility(avg_daily_move_pct);

    insights.push(
      `Average daily move over the last ${volWindow} days is ${formatPct(
        avg_daily_move_pct
      )}, indicating ${volatilityLabel} volatility.`
    );
  }

  // 4) Trend label, if present
  if (summary.trend?.label) {
    insights.push(
      `Trend signal: ${pairLabel} is "${summary.trend.label}" over the last ${summary.trend.window_days} days.`
    );
  }

  // Keep it short & sweet
  return insights.slice(0, 3);
}
