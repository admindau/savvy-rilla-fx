"use client";

import Script from "next/script";
import { useCallback, useState } from "react";

declare global {
  interface Window {
    Redoc?: {
      init: (specUrl: string, options: Record<string, unknown>, element: HTMLElement | null) => void;
    };
  }
}

export default function RedocPage() {
  const [loaded, setLoaded] = useState(false);

  const initializeRedoc = useCallback(() => {
    const container = document.getElementById("redoc-container");
    if (!window.Redoc || !container) return;

    window.Redoc.init(
      "/openapi.json",
      {
        theme: {
          colors: {
            primary: {
              main: "#ffffff",
            },
            text: {
              primary: "#e5e7eb",
              secondary: "#a1a1aa",
            },
            http: {
              get: "#22c55e",
            },
          },
          typography: {
            fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            headings: {
              fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            },
            code: {
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            },
          },
          rightPanel: {
            backgroundColor: "#050505",
          },
          schema: {
            linesColor: "#27272a",
          },
        },
        hideDownloadButton: false,
        nativeScrollbars: true,
        requiredPropsFirst: true,
        sortPropsAlphabetically: true,
      },
      container,
    );
    setLoaded(true);
  }, []);

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-950/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Savvy Rilla FX API</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Reference Manual</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1]" href="/docs">
              Docs home
            </a>
            <a className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1]" href="/docs/api">
              API explorer
            </a>
            <a className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200" href="/openapi.yaml" target="_blank">
              Download YAML
            </a>
          </div>
        </div>
      </header>

      {!loaded ? (
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-zinc-500 md:px-8">
          Loading OpenAPI reference from <code>/openapi.json</code>...
        </div>
      ) : null}

      <div id="redoc-container" className="min-h-screen bg-white text-black" />

      <Script
        src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"
        strategy="afterInteractive"
        onLoad={initializeRedoc}
      />
    </main>
  );
}
