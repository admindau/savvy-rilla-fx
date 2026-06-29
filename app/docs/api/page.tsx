"use client";

import { useEffect, useMemo, useState } from "react";

type OpenApiOperation = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: { type?: string; default?: unknown; enum?: string[] };
    example?: unknown;
  }>;
  security?: Array<Record<string, string[]>>;
};

type OpenApiPathItem = {
  get?: OpenApiOperation;
};

type OpenApiDocument = {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths?: Record<string, OpenApiPathItem>;
};

type ExplorerEndpoint = {
  method: "GET";
  path: string;
  summary: string;
  description: string;
  tag: string;
  parameters: NonNullable<OpenApiOperation["parameters"]>;
};

type RequestResult = {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
};

const DEFAULT_BASE_URL = "https://fx.savvyrilla.tech";
const EXAMPLE_API_KEY = "srfx_test_xxxxxxxxxxxxxxxxxxxxxxxxx";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

function buildEndpointUrl(baseUrl: string, endpoint: ExplorerEndpoint, params: Record<string, string>) {
  let path = endpoint.path;
  const query = new URLSearchParams();

  for (const parameter of endpoint.parameters) {
    const rawValue = params[parameter.name]?.trim();
    if (!rawValue) continue;

    if (parameter.in === "path") {
      path = path.replace(`{${parameter.name}}`, encodeURIComponent(rawValue));
      continue;
    }

    if (parameter.in === "query") {
      query.set(parameter.name, rawValue);
    }
  }

  const queryString = query.toString();
  return `${normalizeBaseUrl(baseUrl)}${path}${queryString ? `?${queryString}` : ""}`;
}

function stringifyHeaders(headers: Headers) {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

function defaultValueForParameter(parameter: ExplorerEndpoint["parameters"][number]) {
  if (parameter.example !== undefined && parameter.example !== null) return String(parameter.example);
  if (parameter.schema?.default !== undefined && parameter.schema.default !== null) {
    return String(parameter.schema.default);
  }
  if (parameter.name.toLowerCase() === "quote") return "USD";
  if (parameter.name.toLowerCase() === "base") return "SSP";
  if (parameter.name.toLowerCase() === "limit") return "30";
  return "";
}

export default function ApiExplorerPage() {
  const [spec, setSpec] = useState<OpenApiDocument | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [selectedPath, setSelectedPath] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<RequestResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSpec() {
      try {
        const response = await fetch("/openapi.json", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`OpenAPI document returned ${response.status}`);
        }

        const data = (await response.json()) as OpenApiDocument;
        setSpec(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSpecError(error instanceof Error ? error.message : "Unable to load OpenAPI document.");
      }
    }

    void loadSpec();

    return () => controller.abort();
  }, []);

  const endpoints = useMemo<ExplorerEndpoint[]>(() => {
    if (!spec?.paths) return [];

    return Object.entries(spec.paths)
      .flatMap(([path, item]) => {
        if (!item.get) return [];
        return [
          {
            method: "GET" as const,
            path,
            summary: item.get.summary ?? path,
            description: item.get.description ?? "No description provided.",
            tag: item.get.tags?.[0] ?? "API",
            parameters: item.get.parameters ?? [],
          },
        ];
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [spec]);

  const selectedEndpoint = useMemo(() => {
    return endpoints.find((endpoint) => endpoint.path === selectedPath) ?? endpoints[0];
  }, [endpoints, selectedPath]);

  const initialParams = useMemo(() => {
    if (!selectedEndpoint) return {};

    return Object.fromEntries(
      selectedEndpoint.parameters.map((parameter) => [
        parameter.name,
        defaultValueForParameter(parameter),
      ]),
    );
  }, [selectedEndpoint]);

  useEffect(() => {
    if (!selectedEndpoint) return;

    const timer = window.setTimeout(() => {
      setSelectedPath((current) => current || selectedEndpoint.path);
      setParams(initialParams);
      setResult(null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [initialParams, selectedEndpoint]);

  const requestUrl = selectedEndpoint ? buildEndpointUrl(baseUrl, selectedEndpoint, params) : "";

  async function sendRequest() {
    if (!selectedEndpoint) return;

    setLoading(true);
    setResult(null);
    const startedAt = performance.now();

    try {
      const response = await fetch(requestUrl, {
        method: selectedEndpoint.method,
        headers: {
          Accept: "application/json",
          ...(apiKey.trim() ? { "X-API-Key": apiKey.trim() } : {}),
        },
      });

      const body = await response.text();
      const durationMs = Math.round(performance.now() - startedAt);

      setResult({
        status: response.status,
        statusText: response.statusText,
        durationMs,
        headers: stringifyHeaders(response.headers),
        body: body ? JSON.stringify(JSON.parse(body), null, 2) : "",
      });
    } catch (error) {
      setResult({
        status: 0,
        statusText: "Request failed",
        durationMs: Math.round(performance.now() - startedAt),
        headers: {},
        body: error instanceof Error ? error.message : "Unknown request error.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1f2937_0,#050505_36%,#000_100%)] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/40 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-zinc-400">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">OpenAPI 3.1</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">Interactive</span>
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                API Explorer
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-400 md:text-lg">
                Explore Savvy Rilla FX endpoints from the OpenAPI specification, configure parameters, add an API key, and execute live requests directly from the browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]" href="/docs">
                Back to docs
              </a>
              <a className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200" href="/openapi.json" target="_blank">
                OpenAPI JSON
              </a>
            </div>
          </div>
        </header>

        {specError ? (
          <section className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-red-100">
            <h2 className="font-semibold">Unable to load OpenAPI specification</h2>
            <p className="mt-2 text-sm text-red-100/80">{specError}</p>
          </section>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-black/40 p-5">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-300">
                Server
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-white/30"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-300">
                API key header
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-white/30"
                  placeholder={EXAMPLE_API_KEY}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-zinc-300">
                Endpoint
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                  value={selectedEndpoint?.path ?? ""}
                  onChange={(event) => setSelectedPath(event.target.value)}
                >
                  {endpoints.map((endpoint) => (
                    <option key={endpoint.path} value={endpoint.path}>
                      {endpoint.path}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Endpoints</p>
              <div className="max-h-[540px] space-y-2 overflow-auto pr-1">
                {endpoints.map((endpoint) => (
                  <button
                    key={endpoint.path}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedEndpoint?.path === endpoint.path
                        ? "border-white/30 bg-white/[0.08]"
                        : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"
                    }`}
                    onClick={() => setSelectedPath(endpoint.path)}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                        {endpoint.method}
                      </span>
                      <span className="text-xs text-zinc-500">{endpoint.tag}</span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-zinc-200">{endpoint.path}</p>
                    <p className="mt-1 text-sm text-zinc-400">{endpoint.summary}</p>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {selectedEndpoint ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    {selectedEndpoint.method}
                  </span>
                  <code className="break-all text-sm text-zinc-200">{selectedEndpoint.path}</code>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{selectedEndpoint.summary}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{selectedEndpoint.description}</p>

                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">Parameters</h3>
                  {selectedEndpoint.parameters.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {selectedEndpoint.parameters.map((parameter) => (
                        <label key={`${parameter.in}-${parameter.name}`} className="block rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
                          <span className="flex items-center justify-between gap-3 text-zinc-300">
                            <span>
                              {parameter.name}
                              {parameter.required ? <span className="text-red-300"> *</span> : null}
                            </span>
                            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{parameter.in}</span>
                          </span>
                          <input
                            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white outline-none transition focus:border-white/30"
                            value={params[parameter.name] ?? ""}
                            onChange={(event) =>
                              setParams((current) => ({
                                ...current,
                                [parameter.name]: event.target.value,
                              }))
                            }
                          />
                          {parameter.description ? (
                            <span className="mt-2 block text-xs leading-5 text-zinc-500">
                              {parameter.description}
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
                      This endpoint does not require parameters.
                    </p>
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Request URL</p>
                  <code className="mt-3 block break-all text-sm text-zinc-200">{requestUrl}</code>
                </div>

                <button
                  className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading || !selectedEndpoint}
                  onClick={sendRequest}
                  type="button"
                >
                  {loading ? "Sending..." : "Send request"}
                </button>
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-white/10 bg-black/50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">Response</h2>
                {result ? (
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">Status {result.status || "error"}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">{result.durationMs}ms</span>
                  </div>
                ) : null}
              </div>

              {result ? (
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Headers</p>
                    <pre className="mt-3 max-h-48 overflow-auto text-xs leading-5 text-zinc-300">
                      {JSON.stringify(result.headers, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Body</p>
                    <pre className="mt-3 max-h-[520px] overflow-auto text-xs leading-5 text-zinc-300">
                      {result.body || "No response body."}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">
                  Select an endpoint, configure parameters, and send a request to view the response.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
