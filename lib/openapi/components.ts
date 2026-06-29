import { exampleError, exampleMarketSummary, exampleRate } from "./examples";

export const openApiComponents = {
  securitySchemes: {
    ApiKeyHeader: {
      type: "apiKey",
      in: "header",
      name: "X-API-Key",
      description: "Savvy Rilla FX API key. Example: srfx_live_xxxxxxxxxxxxxxxxx.",
    },
    BearerApiKey: {
      type: "http",
      scheme: "bearer",
      description: "Alternative API key transport using Authorization: Bearer <api-key>.",
    },
  },
  schemas: {
    ApiEnvelope: {
      type: "object",
      required: ["success", "requestId", "timestamp", "version", "durationMs"],
      properties: {
        success: { type: "boolean" },
        requestId: { type: "string" },
        timestamp: { type: "string", format: "date-time" },
        version: { type: "string", example: "v1" },
        durationMs: { type: "number" },
      },
    },
    ErrorEnvelope: {
      allOf: [
        { $ref: "#/components/schemas/ApiEnvelope" },
        {
          type: "object",
          required: ["error"],
          properties: {
            success: { type: "boolean", const: false },
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  example: "INVALID_CURRENCY",
                },
                message: {
                  type: "string",
                  example: "base and quote must be valid 3-letter currency codes.",
                },
                details: {},
              },
            },
          },
          example: exampleError,
        },
      ],
    },
    ExchangeRate: {
      type: "object",
      required: ["pair", "base", "quote", "as_of_date", "mid_rate"],
      properties: {
        pair: { type: "string", example: "SSP/USD" },
        base: { type: "string", example: "SSP" },
        quote: { type: "string", example: "USD" },
        as_of_date: { type: "string", format: "date", example: "2026-06-29" },
        mid_rate: { type: "number", example: 0.000214 },
        change_pct_vs_previous: { type: ["number", "null"], example: 0.12 },
        is_official: { type: "boolean" },
        is_manual_override: { type: "boolean" },
      },
      example: exampleRate,
    },
    Currency: {
      type: "object",
      required: ["code", "name"],
      properties: {
        code: { type: "string", example: "USD" },
        name: { type: "string", example: "United States Dollar" },
        symbol: { type: ["string", "null"], example: "$" },
        decimals: { type: ["integer", "null"], example: 2 },
        created_at: { type: ["string", "null"], format: "date-time" },
      },
    },
    ChartPoint: {
      type: "object",
      required: ["date", "mid"],
      properties: {
        date: { type: "string", format: "date" },
        mid: { type: "number" },
      },
    },
    MarketHealth: {
      type: "object",
      required: ["score", "status", "color"],
      properties: {
        score: { type: "integer", minimum: 0, maximum: 100, example: 84 },
        status: { type: "string", example: "Stable" },
        color: { type: "string", example: "green" },
      },
    },
    MarketSummary: {
      type: "object",
      properties: {
        base: { type: "string", example: "SSP" },
        quote: { type: "string", example: "USD" },
        as_of_date: { type: "string", format: "date" },
        latest_rate: { type: "number" },
        previous_rate: { type: ["number", "null"] },
        daily_change_pct: { type: ["number", "null"] },
        weekly_change_pct: { type: ["number", "null"] },
        monthly_change_pct: { type: ["number", "null"] },
        volatility: { type: "string", example: "low" },
        trend: { type: "string", example: "stable" },
        marketHealth: { $ref: "#/components/schemas/MarketHealth" },
      },
      example: exampleMarketSummary,
    },
  },
  responses: {
    BadRequest: {
      description: "Invalid request parameters.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorEnvelope" },
        },
      },
    },
    Unauthorized: {
      description: "Missing or invalid API key.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorEnvelope" },
        },
      },
    },
    RateLimited: {
      description: "Rate limit exceeded.",
      headers: {
        "Retry-After": {
          schema: { type: "integer" },
          description: "Seconds until the client should retry.",
        },
      },
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorEnvelope" },
        },
      },
    },
    ServerError: {
      description: "Server-side error.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorEnvelope" },
        },
      },
    },
  },
} as const;
