const currencyParameters = [
  {
    name: "base",
    in: "query",
    required: false,
    schema: { type: "string", minLength: 3, maxLength: 3, default: "SSP" },
    description: "Base currency code.",
  },
  {
    name: "quote",
    in: "query",
    required: false,
    schema: { type: "string", minLength: 3, maxLength: 3, default: "USD" },
    description: "Quote currency code.",
  },
];

const standardErrors = {
  "400": { $ref: "#/components/responses/BadRequest" },
  "401": { $ref: "#/components/responses/Unauthorized" },
  "429": { $ref: "#/components/responses/RateLimited" },
  "500": { $ref: "#/components/responses/ServerError" },
};

const cacheHeaders = {
  ETag: {
    schema: { type: "string" },
    description: "Entity tag for conditional requests.",
  },
  "Last-Modified": {
    schema: { type: "string" },
    description: "Last modification date for the response resource.",
  },
  "X-Cache": {
    schema: { type: "string", enum: ["HIT", "MISS"] },
    description: "Whether the response was served from the API cache.",
  },
};

export const openApiPaths = {
  "/api/health": {
    get: {
      tags: ["Health"],
      summary: "Health check",
      description: "Returns service health, environment and database connectivity status.",
      security: [],
      responses: {
        "200": {
          description: "Service health response.",
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "healthy" },
                      db: { type: "boolean" },
                      service: { type: "string", example: "Savvy Rilla FX API" },
                      environment: { type: "string", example: "production" },
                      uptimeSeconds: { type: "integer" },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/rates/latest": {
    get: {
      tags: ["Rates"],
      summary: "Latest FX rate",
      description: "Returns the latest available rate for a currency pair.",
      parameters: currencyParameters,
      responses: {
        "200": {
          description: "Latest exchange rate.",
          headers: cacheHeaders,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/ExchangeRate" },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/rates/{quote}/latest": {
    get: {
      tags: ["Rates"],
      summary: "Latest FX rate by quote",
      description: "Returns the latest rate for SSP or supplied base currency against the path quote currency.",
      parameters: [
        {
          name: "quote",
          in: "path",
          required: true,
          schema: { type: "string", minLength: 3, maxLength: 3, example: "USD" },
          description: "Quote currency code.",
        },
        {
          name: "base",
          in: "query",
          required: false,
          schema: { type: "string", minLength: 3, maxLength: 3, default: "SSP" },
          description: "Base currency code.",
        },
      ],
      responses: {
        "200": {
          description: "Latest exchange rate.",
          headers: cacheHeaders,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/ExchangeRate" },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/rates/recent": {
    get: {
      tags: ["Rates"],
      summary: "Recent FX rates",
      description: "Returns recent rates for a currency pair.",
      parameters: [
        ...currencyParameters,
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 365, default: 30 },
          description: "Maximum number of records to return.",
        },
      ],
      responses: {
        "200": {
          description: "Recent exchange rates.",
          headers: cacheHeaders,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ExchangeRate" },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/rates/history": {
    get: {
      tags: ["Rates"],
      summary: "Historical FX rates",
      description: "Returns historical chart-ready FX data.",
      parameters: [
        ...currencyParameters,
        {
          name: "mode",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["all", "range"], default: "all" },
        },
        {
          name: "from",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
        {
          name: "to",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
        {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 5000, default: 1000 },
        },
      ],
      responses: {
        "200": {
          description: "Historical exchange rate points.",
          headers: cacheHeaders,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ChartPoint" },
                      },
                      meta: { type: "object" },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/currencies": {
    get: {
      tags: ["Currencies"],
      summary: "Supported currencies",
      description: "Returns supported currency reference data.",
      parameters: [
        {
          name: "search",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
        {
          name: "active",
          in: "query",
          required: false,
          schema: { type: "boolean", default: true },
        },
      ],
      responses: {
        "200": {
          description: "Supported currencies.",
          headers: cacheHeaders,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Currency" },
                      },
                      meta: { type: "object" },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/summary/market": {
    get: {
      tags: ["Market Summary"],
      summary: "Market summary",
      description: "Returns market summary, trend analysis and Market Health Score.",
      parameters: currencyParameters,
      responses: {
        "200": {
          description: "Market intelligence summary.",
          headers: cacheHeaders,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/MarketSummary" },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/summary/insights": {
    get: {
      tags: ["Market Summary"],
      summary: "Market insights",
      description: "Returns AI-style commentary and interpreted market insights.",
      parameters: currencyParameters,
      responses: {
        "200": {
          description: "AI-style insight response.",
          headers: cacheHeaders,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/ApiEnvelope" },
                  {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          commentary: { type: "string" },
                          insights: { type: "array", items: { type: "string" } },
                          marketHealth: { $ref: "#/components/schemas/MarketHealth" },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        ...standardErrors,
      },
    },
  },
  "/api/v1/export/rates": {
    get: {
      tags: ["Export"],
      summary: "Export FX rates",
      description: "Exports FX rates as JSON or CSV depending on supported query parameters.",
      parameters: [
        ...currencyParameters,
        {
          name: "format",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["json", "csv"], default: "json" },
        },
      ],
      responses: {
        "200": {
          description: "Exported rate data.",
        },
        ...standardErrors,
      },
    },
  },
} as const;
