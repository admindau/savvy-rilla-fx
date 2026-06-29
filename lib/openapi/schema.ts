import { openApiComponents } from "./components";
import { openApiPaths } from "./paths";
import { openApiTags } from "./tags";

export const openApiSchema = {
  openapi: "3.1.0",
  info: {
    title: "Savvy Rilla FX API",
    summary: "South Sudan foreign exchange market intelligence API.",
    description:
      "Savvy Rilla FX API provides South Sudanese Pound exchange-rate data, market summaries, AI-style commentary, API-key protected access, rate limiting, caching and developer tooling.",
    version: "1.0.0",
    contact: {
      name: "Savvy Rilla",
      url: "https://fx.savvyrilla.tech",
      email: "admin@savvygorilla.tech",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "https://fx.savvyrilla.tech",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
  ],
  tags: openApiTags,
  security: [
    { ApiKeyHeader: [] },
    { BearerApiKey: [] },
  ],
  paths: openApiPaths,
  components: openApiComponents,
} as const;

export type OpenApiSchema = typeof openApiSchema;
