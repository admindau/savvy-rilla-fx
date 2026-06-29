export const API_BASE_URL = "https://fx.savvyrilla.tech";

export const exampleApiKey = "srfx_test_xxxxxxxxxxxxxxxxxxxxxxxxx";

export const exampleRate = {
  pair: "SSP/USD",
  base: "SSP",
  quote: "USD",
  as_of_date: "2026-06-29",
  mid_rate: 0.000214,
  change_pct_vs_previous: 0.12,
  is_official: true,
  is_manual_override: false,
};

export const exampleMarketSummary = {
  base: "SSP",
  quote: "USD",
  as_of_date: "2026-06-29",
  latest_rate: 0.000214,
  previous_rate: 0.000213,
  daily_change_pct: 0.12,
  weekly_change_pct: 0.45,
  monthly_change_pct: -0.31,
  volatility: "low",
  trend: "stable",
  marketHealth: {
    score: 84,
    status: "Stable",
    color: "green",
  },
};

export const exampleError = {
  success: false,
  requestId: "req_01JFXAMPLE",
  timestamp: "2026-06-29T12:00:00.000Z",
  version: "v1",
  durationMs: 8,
  error: {
    code: "INVALID_CURRENCY",
    message: "base and quote must be valid 3-letter currency codes.",
  },
};
