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

export type MarketHealthLabel =
  | "Excellent"
  | "Stable"
  | "Moderate"
  | "Volatile"
  | "Highly Volatile"
  | "Thin Data";

export type MarketHealthTone = "positive" | "neutral" | "warning" | "danger";

export type MarketHealthComponent = {
  name: string;
  score: number;
  weight: number;
  note: string;
};

export type MarketHealth = {
  score: number;
  label: MarketHealthLabel;
  status: MarketHealthLabel;
  color: "emerald" | "lime" | "amber" | "orange" | "red" | "zinc";
  tone: MarketHealthTone;
  description: string;
  drivers: string[];
  components: MarketHealthComponent[];
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
  const thinDataHealth: MarketHealth = {
    score: 50,
    label: "Thin Data",
    status: "Thin Data",
    color: "zinc",
    tone: "neutral",
    description:
      "Not enough market data is available to calculate a confident health signal.",
    drivers: [
      "Not enough market data is available to calculate a confident signal.",
    ],
    components: [
      {
        name: "Data availability",
        score: 50,
        weight: 100,
        note: "Additional observations are required for a stronger signal.",
      },
    ],
  };

  if (!summary || !summary.mid_rate || summary.mid_rate <= 0) {
    return thinDataHealth;
  }

  const drivers: string[] = [];
  const components: MarketHealthComponent[] = [];

  const component = (
    name: string,
    score: number,
    weight: number,
    note: string
  ) => {
    const normalizedScore = Math.round(clamp(score, 0, 100));
    components.push({ name, score: normalizedScore, weight, note });
    return normalizedScore * (weight / 100);
  };

  const dailyChange = summary.changes?.daily_pct ?? summary.change_pct_vs_previous;
  let weightedScore = 0;

  if (dailyChange === null || Number.isNaN(dailyChange)) {
    weightedScore += component(
      "Daily movement",
      58,
      20,
      "Previous-day movement is not yet available."
    );
    drivers.push("Previous-day movement is not yet available.");
  } else {
    const absDaily = Math.abs(dailyChange);
    if (absDaily < 0.1) {
      weightedScore += component(
        "Daily movement",
        94,
        20,
        "Daily movement is minimal."
      );
      drivers.push("Daily movement is minimal, supporting a stable reading.");
    } else if (absDaily < 0.5) {
      weightedScore += component(
        "Daily movement",
        78,
        20,
        "Daily movement is moderate."
      );
      drivers.push("Daily movement is moderate and worth monitoring.");
    } else if (absDaily < 1.5) {
      weightedScore += component(
        "Daily movement",
        55,
        20,
        "Daily movement is elevated."
      );
      drivers.push("Daily movement is elevated versus the previous fixing.");
    } else {
      weightedScore += component(
        "Daily movement",
        35,
        20,
        "Daily movement is highly elevated."
      );
      drivers.push("Daily movement is highly elevated versus the previous fixing.");
    }
  }

  const sevenDayChange = summary.changes?.seven_day_pct ?? summary.trend?.change_pct ?? null;
  if (sevenDayChange === null || Number.isNaN(sevenDayChange)) {
    weightedScore += component(
      "7-day stability",
      60,
      20,
      "Seven-day trend data is limited."
    );
    drivers.push("Seven-day stability data is limited.");
  } else {
    const absSeven = Math.abs(sevenDayChange);
    if (absSeven < 0.35) {
      weightedScore += component(
        "7-day stability",
        92,
        20,
        "The seven-day move is contained."
      );
      drivers.push("The seven-day movement remains contained.");
    } else if (absSeven < 1.25) {
      weightedScore += component(
        "7-day stability",
        76,
        20,
        "The seven-day move is moderate."
      );
      drivers.push("The seven-day movement is moderate.");
    } else if (absSeven < 3) {
      weightedScore += component(
        "7-day stability",
        54,
        20,
        "The seven-day move is elevated."
      );
      drivers.push("The seven-day movement is elevated.");
    } else {
      weightedScore += component(
        "7-day stability",
        34,
        20,
        "The seven-day move is sharp."
      );
      drivers.push("The seven-day movement is sharp.");
    }
  }

  const rangeHigh = summary.ranges?.thirty_day?.high ?? summary.range?.high ?? null;
  const rangeLow = summary.ranges?.thirty_day?.low ?? summary.range?.low ?? null;
  if (rangeHigh !== null && rangeLow !== null && rangeHigh > 0 && rangeLow > 0 && rangeHigh >= rangeLow) {
    const rangePct = ((rangeHigh - rangeLow) / summary.mid_rate) * 100;
    if (rangePct < 1) {
      weightedScore += component(
        "30-day range",
        94,
        20,
        "The recent range remains tight."
      );
      drivers.push("The recent trading range remains tight.");
    } else if (rangePct < 3) {
      weightedScore += component(
        "30-day range",
        78,
        20,
        "The recent range is moderate."
      );
      drivers.push("The recent trading range is moderate.");
    } else if (rangePct < 6) {
      weightedScore += component(
        "30-day range",
        56,
        20,
        "The recent range is wide."
      );
      drivers.push("The recent trading range is wide for this market.");
    } else {
      weightedScore += component(
        "30-day range",
        35,
        20,
        "The recent range is very wide."
      );
      drivers.push("The recent trading range is very wide for this market.");
    }
  } else {
    weightedScore += component(
      "30-day range",
      58,
      20,
      "Range data is incomplete."
    );
    drivers.push("Range data is incomplete for the selected window.");
  }

  const volatilityLabel =
    summary.signals?.volatility_label ??
    classifyVolatility(summary.volatility?.avg_daily_move_pct ?? null);

  if (volatilityLabel === "very low") {
    weightedScore += component(
      "Volatility",
      95,
      25,
      "Average daily volatility is very low."
    );
    drivers.push("Average daily volatility is very low.");
  } else if (volatilityLabel === "low") {
    weightedScore += component(
      "Volatility",
      88,
      25,
      "Average daily volatility is low."
    );
    drivers.push("Average daily volatility is low.");
  } else if (volatilityLabel === "elevated") {
    weightedScore += component(
      "Volatility",
      58,
      25,
      "Average daily volatility is elevated."
    );
    drivers.push("Average daily volatility is elevated.");
  } else if (volatilityLabel === "high") {
    weightedScore += component(
      "Volatility",
      34,
      25,
      "Average daily volatility is high."
    );
    drivers.push("Average daily volatility is high.");
  } else {
    weightedScore += component(
      "Volatility",
      60,
      25,
      "Volatility data is not yet available."
    );
    drivers.push("Volatility data is not yet available.");
  }

  const trendStrength = summary.signals?.trend_strength ?? "unknown";
  const trendLabel = summary.trend?.label ?? "Range-Bound";
  if (trendLabel === "Range-Bound") {
    weightedScore += component(
      "Trend consistency",
      88,
      15,
      "Trend signal remains range-bound."
    );
    drivers.push("Trend signal remains range-bound.");
  } else if (trendStrength === "weak") {
    weightedScore += component(
      "Trend consistency",
      80,
      15,
      `Trend signal is ${trendLabel.toLowerCase()} but weak.`
    );
    drivers.push(`Trend signal currently reads ${trendLabel}, but strength is weak.`);
  } else if (trendStrength === "moderate") {
    weightedScore += component(
      "Trend consistency",
      65,
      15,
      `Trend signal is ${trendLabel.toLowerCase()} and moderate.`
    );
    drivers.push(`Trend signal currently reads ${trendLabel} with moderate strength.`);
  } else if (trendStrength === "strong") {
    weightedScore += component(
      "Trend consistency",
      48,
      15,
      `Trend signal is ${trendLabel.toLowerCase()} and strong.`
    );
    drivers.push(`Trend signal currently reads ${trendLabel} with strong directional pressure.`);
  } else {
    weightedScore += component(
      "Trend consistency",
      62,
      15,
      "Trend strength is not yet available."
    );
    drivers.push("Trend strength is not yet available.");
  }

  const finalScore = Math.round(clamp(weightedScore, 0, 100));

  let label: MarketHealthLabel;
  let color: MarketHealth["color"];
  let tone: MarketHealthTone;
  let description: string;

  if (finalScore >= 90) {
    label = "Excellent";
    color = "lime";
    tone = "positive";
    description = "The market is showing very strong stability across recent movement, range, volatility, and trend signals.";
  } else if (finalScore >= 75) {
    label = "Stable";
    color = "emerald";
    tone = "positive";
    description = "The market is broadly stable, with limited stress across the main short-term indicators.";
  } else if (finalScore >= 60) {
    label = "Moderate";
    color = "amber";
    tone = "neutral";
    description = "The market is generally manageable but showing signals that should be monitored.";
  } else if (finalScore >= 40) {
    label = "Volatile";
    color = "orange";
    tone = "warning";
    description = "The market is showing elevated movement or range conditions and should be watched closely.";
  } else {
    label = "Highly Volatile";
    color = "red";
    tone = "danger";
    description = "The market is showing significant stress across recent movement, volatility, or trend conditions.";
  }

  return {
    score: finalScore,
    label,
    status: label,
    color,
    tone,
    description,
    drivers: drivers.slice(0, 4),
    components,
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
