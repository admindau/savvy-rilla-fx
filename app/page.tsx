export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Savvy Rilla FX API
        </h1>
        <p className="text-sm text-zinc-400">
          Internal FX infrastructure for SSP and key global currencies.
          Powered by Supabase &amp; Vercel. Built for the Savvy Rilla ecosystem.
        </p>
        <p className="mt-4 text-xs text-zinc-500">
          Endpoint docs and charts coming soon. For now, use{" "}
          <code className="rounded bg-zinc-900 px-1 py-0.5">
            /api/health
          </code>{" "}
          to verify the service.
        </p>
      </div>
    </main>
  );
}
