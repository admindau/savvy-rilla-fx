// lib/fx/insights.ts

export type TrendLabel = "Range-Bound" | "Uptrend" | "Downtrend";
export type VolatilityLabel = "very low" | "low" | "elevated" | "high" | "unknown";
export type MarketDirection = "up" | "down" | "flat" | "unknown";

export type MarketSummary = {
  base: string; // e.g. "SSP"
  quote: string; // e.g. "USD"
  pair: string;
  as_of_date: string;
  mid_rate: number;

  // Backward-compatible fields already consumed by the dashboard/API.
  change_pct_vs_previous: number | null;
  range: {
    window_days: number;
    high: number;
    low: number;
  };
  trend: {
    window_days: number;
    label: TrendLabel | null;
    change_pct?: number | null;
    direction?: MarketDirection;
  };
  volatility: {
    window_days: number;
    avg_daily_move_pct: number | null;
    label?: VolatilityLabel;
  };

  // FX-II-01A intelligence engine additions.
  changes: {
    daily_pct: number | null;
    seven_day_pct: number | null;
    thirty_day_pct: number | null;
  };
  ranges: {
    seven_day: MarketRange;
    thirty_day: MarketRange;
  };
  averages: {
    seven_day: number | null;
    thirty_day: number | null;
  };
  observations: {
    history_count: number;
    first_date: string | null;
    latest_date: string;
  };
  signals: {
    daily_direction: MarketDirection;
    seven_day_direction: MarketDirection;
    thirty_day_direction: MarketDirection;
    volatility_label: VolatilityLabel;
    trend_strength: "weak" | "moderate" | "strong" | "unknown";
  };
};

export type MarketRange = {
  window_days: number;
  high: number | null;
  low: number | null;
  spread: number | null;
  spread_pct: number | null;
};

export type MarketHealth = {
  score: number;
  label: "Stable" | "Watch" | "Volatile" | "Thin Data";
  tone: "positive" | "neutral" | "warning";
  drivers: string[];
};

export type FxRatePoint = {
  as_of_date: string;
  rate_mid: number | string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value: number | null, digits = 4): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatPair(summary: Pick<MarketSummary, "base" | "quote">) {
  // For SSP markets we want "USD/SSP" style.
  return `${summary.quote}/${summary.base}`;
}

function formatPct(value: number, digits = 2) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function pctChange(start: number | null, end: number | null): number | null {
  if (start === null || end === null || start === 0) return null;
  return ((end - start) / start) * 100;
}

function classifyDirection(changePct: number | null): MarketDirection {
  if (changePct === null || Number.isNaN(changePct)) return "unknown";
  if (Math.abs(changePct) < 0.05) return "flat";
  return changePct > 0 ? "up" : "down";
}

function classifyTrend(changePct: number | null): TrendLabel {
  const direction = classifyDirection(changePct);
  if (direction === "up") return "Uptrend";
  if (direction === "down") return "Downtrend";
  return "Range-Bound";
}

function classifyTrendStrength(changePct: number | null) {
  if (changePct === null || Number.isNaN(changePct)) return "unknown" as const;
  const abs = Math.abs(changePct);
  if (abs < 0.25) return "weak" as const;
  if (abs < 1) return "moderate" as const;
  return "strong" as const;
}

function classifyVolatility(avgDailyMovePct: number | null): VolatilityLabel {
  if (avgDailyMovePct === null || Number.isNaN(avgDailyMovePct)) {
    return "unknown";
  }

  const vol = Math.abs(avgDailyMovePct);
  if (vol < 0.1) return "very low";
  if (vol < 0.3) return "low";
  if (vol < 0.7) return "elevated";
  return "high";
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildRange(values: number[], windowDays: number, fallback: number): MarketRange {
  const usableValues = values.length > 0 ? values : [fallback];
  const high = Math.max(...usableValues);
  const low = Math.min(...usableValues);
  const spread = high - low;
  const spreadPct = fallback !== 0 ? (spread / fallback) * 100 : null;

  return {
    window_days: windowDays,
    high: round(high),
    low: round(low),
    spread: round(spread),
    spread_pct: round(spreadPct),
  };
}

function avgAbsoluteDailyMove(values: number[]): number | null {
  if (values.length < 2) return null;

  let sum = 0;
  let count = 0;

  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    if (prev !== 0) {
      sum += Math.abs((curr - prev) / prev) * 100;
      count += 1;
    }
  }

  return count > 0 ? sum / count : null;
}

function normalizeSeries(rows: FxRatePoint[]) {
  return rows
    .map((row) => ({
      date: row.as_of_date,
      mid: toNumber(row.rate_mid),
    }))
    .filter((point): point is { date: string; mid: number } => point.mid !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildMarketSummaryFromRows(params: {
  base: string;
  quote: string;
  latest: FxRatePoint;
  previous?: FxRatePoint | null;
  history: FxRatePoint[];
}): MarketSummary {
  const base = params.base.toUpperCase();
  const quote = params.quote.toUpperCase();
  const latestMid = toNumber(params.latest.rate_mid);

  if (latestMid === null) {
    throw new Error("Latest FX record has no valid mid rate.");
  }

  const history = normalizeSeries(params.history);
  const historyWithLatest = history.some(
    (point) => point.date === params.latest.as_of_date && point.mid === latestMid
  )
    ? history
    : [...history, { date: params.latest.as_of_date, mid: latestMid }].sort((a, b) =>
        a.date.localeCompare(b.date)
      );

  const series = historyWithLatest.map((point) => point.mid);
  const last7 = series.slice(-7);
  const last30 = series.slice(-30);

  const previousMid = params.previous ? toNumber(params.previous.rate_mid) : null;
  const dailyChange = pctChange(previousMid, latestMid);
  const sevenDayChange = last7.length >= 2 ? pctChange(last7[0], latestMid) : null;
  const thirtyDayChange = last30.length >= 2 ? pctChange(last30[0], latestMid) : null;

  const range7 = buildRange(last7, 7, latestMid);
  const range30 = buildRange(last30, 30, latestMid);
  const volatility30 = avgAbsoluteDailyMove(last30);
  const volatilityLabel = classifyVolatility(volatility30);
  const trendChange = sevenDayChange ?? dailyChange;
  const trendLabel = classifyTrend(trendChange);

  return {
    base,
    quote,
    pair: `${quote}/${base}`,
    as_of_date: params.latest.as_of_date,
    mid_rate: round(latestMid) ?? latestMid,
    change_pct_vs_previous: round(dailyChange),
    range: {
      window_days: 7,
      high: range7.high ?? latestMid,
      low: range7.low ?? latestMid,
    },
    trend: {
      window_days: 7,
      label: trendLabel,
      change_pct: round(trendChange),
      direction: classifyDirection(trendChange),
    },
    volatility: {
      window_days: 30,
      avg_daily_move_pct: round(volatility30),
      label: volatilityLabel,
    },
    changes: {
      daily_pct: round(dailyChange),
      seven_day_pct: round(sevenDayChange),
      thirty_day_pct: round(thirtyDayChange),
    },
    ranges: {
      seven_day: range7,
      thirty_day: range30,
    },
    averages: {
      seven_day: round(average(last7)),
      thirty_day: round(average(last30)),
    },
    observations: {
      history_count: historyWithLatest.length,
      first_date: historyWithLatest[0]?.date ?? null,
      latest_date: params.latest.as_of_date,
    },
    signals: {
      daily_direction: classifyDirection(dailyChange),
      seven_day_direction: classifyDirection(sevenDayChange),
      thirty_day_direction: classifyDirection(thirtyDayChange),
      volatility_label: volatilityLabel,
      trend_strength: classifyTrendStrength(trendChange),
    },
  };
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

  const dailyChange = summary.changes?.daily_pct ?? summary.change_pct_vs_previous;
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

  const rangeHigh = summary.ranges?.thirty_day?.high ?? summary.range?.high ?? 0;
  const rangeLow = summary.ranges?.thirty_day?.low ?? summary.range?.low ?? 0;
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

  const volatilityLabel =
    summary.signals?.volatility_label ??
    classifyVolatility(summary.volatility?.avg_daily_move_pct ?? null);

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

  // 1) Change vs previous fixing.
  const dailyChange = summary.changes?.daily_pct ?? summary.change_pct_vs_previous;
  if (dailyChange !== null) {
    const absDelta = Math.abs(dailyChange);

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
        dailyChange
      )}).`
    );
  }

  // 2) 30-day range.
  const thirtyDayRange = summary.ranges?.thirty_day;
  const high = thirtyDayRange?.high ?? summary.range.high;
  const low = thirtyDayRange?.low ?? summary.range.low;
  const rangeWindow = thirtyDayRange?.window_days ?? summary.range.window_days;

  if (summary.mid_rate > 0 && high != null && low != null && high >= low) {
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

  // 3) Volatility.
  const { avg_daily_move_pct, window_days: volWindow } = summary.volatility;
  if (avg_daily_move_pct !== null) {
    const volatilityLabel =
      summary.signals?.volatility_label ?? classifyVolatility(avg_daily_move_pct);

    insights.push(
      `Average daily move over the last ${volWindow} days is ${formatPct(
        avg_daily_move_pct
      )}, indicating ${volatilityLabel} volatility.`
    );
  }

  // 4) Trend label, if present.
  if (summary.trend?.label) {
    const trendChange = summary.trend.change_pct;
    const trendContext =
      trendChange === null || trendChange === undefined
        ? ""
        : ` (${formatPct(trendChange)} over the window)`;

    insights.push(
      `Trend signal: ${pairLabel} is "${summary.trend.label}" over the last ${summary.trend.window_days} days${trendContext}.`
    );
  }

  // Keep it short & sweet.
  return insights.slice(0, 3);
}
