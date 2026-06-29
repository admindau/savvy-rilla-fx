// app/docs/page.tsx
"use client";

import { useMemo, useState } from "react";

type CodeLanguage = "curl" | "javascript" | "python" | "php" | "dart";

type Endpoint = {
  method: "GET";
  path: string;
  title: string;
  description: string;
  cache: string;
  rateLimit: string;
  params: Array<{
    name: string;
    required: boolean;
    description: string;
    example: string;
  }>;
  sampleResponse: string;
};

const EXAMPLE_API_KEY = "srfx_test_xxxxxxxxxxxxxxxxxxxxxxxxx";

const BASE_URL = "https://fx.savvyrilla.tech";
const API_BASE = `${BASE_URL}/api/v1`;

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/rates/latest",
    title: "Latest FX Rates",
    description:
      "Returns the latest available exchange rates for SSP against supported quote currencies.",
    cache: "Public cache, short TTL",
    rateLimit: "120 requests per minute per IP or API key",
    params: [
      {
        name: "base",
        required: false,
        description: "Base currency. Defaults to SSP.",
        example: "SSP",
      },
    ],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 12,
  "data": {
    "base": "SSP",
    "asOfDate": "2026-06-29",
    "rates": [
      {
        "quote": "USD",
        "rate": 4685,
        "source": "Savvy Rilla FX"
      }
    ]
  }
}`,
  },
  {
    method: "GET",
    path: "/rates/USD/latest",
    title: "Latest Rate by Quote Currency",
    description:
      "Returns the latest rate for one quote currency, such as USD, KES, EUR, or GBP.",
    cache: "Public cache, short TTL",
    rateLimit: "120 requests per minute per IP or API key",
    params: [
      {
        name: "base",
        required: false,
        description: "Base currency. Defaults to SSP.",
        example: "SSP",
      },
    ],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 9,
  "data": {
    "base": "SSP",
    "quote": "USD",
    "rate": 4685,
    "asOfDate": "2026-06-29"
  }
}`,
  },
  {
    method: "GET",
    path: "/rates/history",
    title: "Historical Rates",
    description:
      "Returns historical FX observations for a currency pair over a date range.",
    cache: "Public cache, medium TTL",
    rateLimit: "120 requests per minute per IP or API key",
    params: [
      {
        name: "base",
        required: false,
        description: "Base currency. Defaults to SSP.",
        example: "SSP",
      },
      {
        name: "quote",
        required: false,
        description: "Quote currency. Defaults to USD.",
        example: "USD",
      },
      {
        name: "from",
        required: false,
        description: "Start date in YYYY-MM-DD format.",
        example: "2026-01-01",
      },
      {
        name: "to",
        required: false,
        description: "End date in YYYY-MM-DD format.",
        example: "2026-06-29",
      },
    ],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 18,
  "data": {
    "base": "SSP",
    "quote": "USD",
    "points": [
      {
        "date": "2026-06-29",
        "rate": 4685
      }
    ]
  }
}`,
  },
  {
    method: "GET",
    path: "/rates/recent",
    title: "Recent Rates",
    description:
      "Returns recent observations for quick charts, widgets, and lightweight integrations.",
    cache: "Public cache, short TTL",
    rateLimit: "120 requests per minute per IP or API key",
    params: [
      {
        name: "base",
        required: false,
        description: "Base currency. Defaults to SSP.",
        example: "SSP",
      },
      {
        name: "quote",
        required: false,
        description: "Quote currency. Defaults to USD.",
        example: "USD",
      },
      {
        name: "limit",
        required: false,
        description: "Number of recent records to return.",
        example: "30",
      },
    ],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 10,
  "data": {
    "base": "SSP",
    "quote": "USD",
    "limit": 30,
    "points": []
  }
}`,
  },
  {
    method: "GET",
    path: "/summary/market",
    title: "Market Summary",
    description:
      "Returns market movement, volatility, health score, and structured commentary for a currency pair.",
    cache: "Public cache, short TTL",
    rateLimit: "120 requests per minute per IP or API key",
    params: [
      {
        name: "base",
        required: false,
        description: "Base currency. Defaults to SSP.",
        example: "SSP",
      },
      {
        name: "quote",
        required: false,
        description: "Quote currency. Defaults to USD.",
        example: "USD",
      },
    ],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 16,
  "data": {
    "pair": "SSP/USD",
    "marketHealth": {
      "score": 84,
      "status": "Stable",
      "color": "green"
    },
    "commentary": {
      "headline": "SSP market remains broadly stable"
    }
  }
}`,
  },
  {
    method: "GET",
    path: "/summary/insights",
    title: "AI Commentary Insights",
    description:
      "Returns richer market narrative and insight blocks derived from the latest FX summary.",
    cache: "Public cache, short TTL",
    rateLimit: "120 requests per minute per IP or API key",
    params: [
      {
        name: "base",
        required: false,
        description: "Base currency. Defaults to SSP.",
        example: "SSP",
      },
      {
        name: "quote",
        required: false,
        description: "Quote currency. Defaults to USD.",
        example: "USD",
      },
    ],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 20,
  "data": {
    "headline": "Market remains stable",
    "summary": "The SSP traded within a narrow range against the USD.",
    "signals": []
  }
}`,
  },
  {
    method: "GET",
    path: "/currencies",
    title: "Supported Currencies",
    description:
      "Returns the supported currency universe exposed by the FX API.",
    cache: "Public cache, long TTL",
    rateLimit: "120 requests per minute per IP or API key",
    params: [],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 5,
  "data": {
    "currencies": ["SSP", "USD", "KES", "EUR", "GBP"]
  }
}`,
  },
  {
    method: "GET",
    path: "/export/rates",
    title: "Export Rates",
    description:
      "Exports rate data for research, reporting, dashboards, and external workflows.",
    cache: "No store",
    rateLimit: "120 requests per minute per IP or API key",
    params: [
      {
        name: "format",
        required: false,
        description: "Export format. Supported values depend on the route implementation.",
        example: "json",
      },
    ],
    sampleResponse: `{
  "success": true,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 25,
  "data": {
    "exported": true
  }
}`,
  },
];

const errorCodes = [
  {
    code: "BAD_REQUEST",
    status: "400",
    description: "The request could not be processed.",
  },
  {
    code: "INVALID_CURRENCY",
    status: "400",
    description: "A currency code was missing or malformed.",
  },
  {
    code: "INVALID_PARAMETER",
    status: "400",
    description: "A query parameter was invalid.",
  },
  {
    code: "MISSING_PARAMETER",
    status: "400",
    description: "A required query parameter was not provided.",
  },
  {
    code: "NO_DATA",
    status: "404",
    description: "No FX data exists for the requested resource.",
  },
  {
    code: "RATE_LIMITED",
    status: "429",
    description: "The rate limit was exceeded. Retry after the reset window.",
  },
  {
    code: "DB_ERROR",
    status: "500",
    description: "The API could not complete a database operation.",
  },
];

function buildQuery(params: Endpoint["params"]): string {
  const entries = params
    .filter((param) => param.example)
    .map((param) => `${param.name}=${encodeURIComponent(param.example)}`);

  return entries.length > 0 ? `?${entries.join("&")}` : "";
}

function buildUrl(endpoint: Endpoint): string {
  return `${API_BASE}${endpoint.path}${buildQuery(endpoint.params)}`;
}

function buildSnippet(endpoint: Endpoint, language: CodeLanguage): string {
  const url = buildUrl(endpoint);

  switch (language) {
    case "curl":
      return `curl -X GET "${url}" \\
  -H "Accept: application/json" \\
  -H "X-API-Key: ${EXAMPLE_API_KEY}"`;
    case "javascript":
      return `const response = await fetch("${url}", {
  headers: {
    Accept: "application/json",
    "X-API-Key": "srfx_live_your_api_key",
  },
});

const data = await response.json();
console.log(data);`;
    case "python":
      return `import requests

response = requests.get(
    "${url}",
    headers={
        "Accept": "application/json",
        "X-API-Key": "srfx_live_your_api_key",
    },
    timeout=20,
)

print(response.json())`;
    case "php":
      return `<?php
$context = stream_context_create([
    "http" => [
        "header" => "Accept: application/json\\r\\nX-API-Key: srfx_live_your_api_key\\r\\n"
    ]
]);
$response = file_get_contents("${url}", false, $context);
$data = json_decode($response, true);

print_r($data);`;
    case "dart":
      return `import "dart:convert";
import "package:http/http.dart" as http;

final response = await http.get(
  Uri.parse("${url}"),
  headers: {
    "Accept": "application/json",
    "X-API-Key": "srfx_live_your_api_key",
  },
);

final data = jsonDecode(response.body);
print(data);`;
    default:
      return url;
  }
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
        {title}
      </h2>
      <p className="max-w-3xl text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.1]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Example
        </span>
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [language, setLanguage] = useState<CodeLanguage>("curl");

  const snippet = useMemo(
    () => buildSnippet(endpoint, language),
    [endpoint, language],
  );

  return (
    <article
      id={endpoint.path.replaceAll("/", "-").replace(/^-/, "")}
      className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/30 md:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {endpoint.method}
            </span>
            <code className="rounded-full border border-white/10 bg-black px-3 py-1 text-xs text-zinc-300">
              {endpoint.path}
            </code>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{endpoint.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {endpoint.description}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill>{endpoint.cache}</Pill>
          <Pill>{endpoint.rateLimit}</Pill>
        </div>
      </div>

      {endpoint.params.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Parameter</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Example</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-zinc-300">
              {endpoint.params.map((param) => (
                <tr key={param.name}>
                  <td className="px-4 py-3 font-mono text-xs">{param.name}</td>
                  <td className="px-4 py-3">{param.required ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {param.example}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-400">
          This endpoint does not require query parameters.
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["curl", "javascript", "python", "php", "dart"] as CodeLanguage[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    language === item
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <CodeBlock code={snippet} />
        </div>

        <CodeBlock code={endpoint.sampleResponse} />
      </div>
    </article>
  );
}

export default function DocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<CodeLanguage>("curl");

  const selectedSnippet = useMemo(
    () => buildSnippet(selectedEndpoint, selectedLanguage),
    [selectedEndpoint, selectedLanguage],
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0,#050505_36%,#000_100%)] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/40 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="flex flex-wrap gap-2">
                <Pill>Savvy Rilla FX API</Pill>
                <Pill>Version v1</Pill>
                <Pill>Production Ready</Pill>
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Developer Documentation
                </h1>
                <p className="max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
                  Integrate reliable South Sudanese Pound FX data, market summaries,
                  AI-style commentary, and currency intelligence into applications,
                  dashboards, reports, and internal tools.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#quick-start"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                >
                  Quick start
                </a>
                <a
                  href="#endpoints"
                  className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                >
                  View endpoints
                </a>
              </div>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Base URL
                </p>
                <p className="mt-3 break-all font-mono text-xs text-zinc-300">
                  {API_BASE}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                  Status
                </p>
                <p className="mt-3 text-sm font-semibold text-emerald-100">
                  Operational
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Rate limit
                </p>
                <p className="mt-3 text-sm font-semibold text-zinc-200">
                  120 req/min
                </p>
              </div>
            </div>
          </div>
        </header>

        <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-2 text-sm text-zinc-300">
          {[
            ["Overview", "#overview"],
            ["Quick Start", "#quick-start"],
            ["API Keys", "#api-keys"],
            ["Explorer", "#explorer"],
            ["Endpoints", "#endpoints"],
            ["Errors", "#errors"],
            ["Headers", "#headers"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="shrink-0 rounded-full px-4 py-2 transition hover:bg-white/[0.08] hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <section id="overview" className="mt-14 grid gap-4 md:grid-cols-4">
          {[
            ["Versioned", "All public routes live under /api/v1."],
            ["Hardened", "Request IDs, security headers, and rate limits are enabled."],
            ["Consistent", "Success and error responses follow one JSON contract."],
            ["Developer-first", "Examples are provided for common integration stacks."],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
            >
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </div>
          ))}
        </section>

        <section id="quick-start" className="mt-16 space-y-6">
          <SectionTitle
            eyebrow="Quick Start"
            title="Make your first request"
            description="The public v1 endpoints are read-only. API keys are not required today, but the platform already accepts the x-api-key header for future commercial access tiers."
          />

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <h3 className="text-lg font-semibold text-white">Response contract</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Every hardened endpoint returns request metadata alongside the
                business payload. This makes debugging, logging, and support easier.
              </p>
              <div className="mt-5 space-y-2 text-sm text-zinc-300">
                <p>
                  <span className="text-zinc-500">success:</span> Boolean request state
                </p>
                <p>
                  <span className="text-zinc-500">requestId:</span> Correlation ID
                </p>
                <p>
                  <span className="text-zinc-500">durationMs:</span> Server processing time
                </p>
                <p>
                  <span className="text-zinc-500">version:</span> API version
                </p>
              </div>
            </div>

            <CodeBlock code={buildSnippet(endpoints[0], "curl")} />
          </div>
        </section>



        <section id="api-keys" className="mt-16 space-y-6">
          <SectionTitle
            eyebrow="API Keys"
            title="Secure access for developer integrations"
            description="Public endpoints remain backwards compatible, but Savvy Rilla FX now supports API-key authentication for managed developer access, quotas, analytics, and future commercial plans."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <h3 className="text-lg font-semibold text-white">Header authentication</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Send your key using X-API-Key. Authorization: Bearer is also supported.
              </p>
              <code className="mt-5 block overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-zinc-300">
                X-API-Key: srfx_live_your_api_key
              </code>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <h3 className="text-lg font-semibold text-white">Key environments</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Keys are prefixed by environment so test and production traffic are easy to distinguish.
              </p>
              <div className="mt-5 space-y-2 font-mono text-xs text-zinc-300">
                <p>srfx_test_...</p>
                <p>srfx_live_...</p>
                <p>srfx_admin_...</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <h3 className="text-lg font-semibold text-white">Developer portal</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Admins can create, revoke, and monitor keys from the internal API key console.
              </p>
              <a
                href="/admin/api-keys"
                className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Open API key console
              </a>
            </div>
          </div>
        </section>

        <section id="explorer" className="mt-16 space-y-6">
          <SectionTitle
            eyebrow="API Explorer"
            title="Build a request"
            description="Select an endpoint and language to generate a copy-ready request. Live execution can be added later without changing the endpoint reference model."
          />

          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Endpoint
              </label>
              <select
                value={selectedEndpoint.path}
                onChange={(event) => {
                  const nextEndpoint =
                    endpoints.find((item) => item.path === event.target.value) ??
                    endpoints[0];
                  setSelectedEndpoint(nextEndpoint);
                }}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
              >
                {endpoints.map((endpoint) => (
                  <option key={endpoint.path} value={endpoint.path}>
                    {endpoint.method} {endpoint.path}
                  </option>
                ))}
              </select>

              <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(event) =>
                  setSelectedLanguage(event.target.value as CodeLanguage)
                }
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"
              >
                {(["curl", "javascript", "python", "php", "dart"] as CodeLanguage[]).map(
                  (language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ),
                )}
              </select>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/50 p-4">
                <p className="text-sm font-semibold text-white">
                  {selectedEndpoint.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {selectedEndpoint.description}
                </p>
              </div>
            </div>

            <CodeBlock code={selectedSnippet} />
          </div>
        </section>

        <section id="endpoints" className="mt-16 space-y-6">
          <SectionTitle
            eyebrow="Endpoint Reference"
            title="Public v1 endpoints"
            description="These endpoints are designed for dashboards, widgets, internal tools, research workflows, and developer integrations."
          />

          <div className="space-y-5">
            {endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.path} endpoint={endpoint} />
            ))}
          </div>
        </section>

        <section id="errors" className="mt-16 space-y-6">
          <SectionTitle
            eyebrow="Errors"
            title="Standard error responses"
            description="Errors use stable machine-readable codes and human-readable messages. The requestId should be included in support/debugging reports."
          />

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">HTTP</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {errorCodes.map((error) => (
                    <tr key={error.code}>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-200">
                        {error.code}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{error.status}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {error.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CodeBlock
              code={`{
  "success": false,
  "requestId": "req_...",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "version": "v1",
  "durationMs": 3,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please retry after the reset window.",
    "details": {
      "limit": 120,
      "remaining": 0,
      "resetSeconds": 60
    }
  }
}`}
            />
          </div>
        </section>

        <section id="headers" className="mt-16 space-y-6">
          <SectionTitle
            eyebrow="Headers"
            title="Operational headers"
            description="The API returns headers that help clients cache responses, identify request traces, and respect rate limits."
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["X-Request-ID", "Unique request correlation identifier."],
              ["X-API-Version", "Current API version."],
              ["X-Response-Time", "Server processing duration."],
              ["X-RateLimit-Limit", "Maximum requests in the active window."],
              ["X-RateLimit-Remaining", "Requests remaining in the active window."],
              ["X-RateLimit-Reset", "Unix timestamp for the rate-limit reset."],
            ].map(([header, description]) => (
              <div
                key={header}
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
              >
                <code className="text-sm text-white">{header}</code>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-sm text-zinc-400">
          <p>
            Savvy Rilla FX API is part of the Savvy Rilla platform ecosystem.
            This documentation covers public v1 endpoints and is designed to
            evolve toward API keys, usage analytics, client dashboards, and a
            full developer portal.
          </p>
        </footer>
      </div>
    </main>
  );
}
