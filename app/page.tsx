export default function Page() {
  return (
    <main className="min-h-dvh bg-black text-white p-8">
      <img src="/logo.png" alt="Savvy Rilla" width="160" height="160" className="mb-6" />
      <h1 className="text-4xl font-bold mb-2">Savvy Rilla FX API</h1>
      <p className="opacity-80">Immaculate, SSP-first FX API.</p>

      {/* ONLY these two links — no duplicates */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-3xl">
        <a href="/usd-to-ssp" className="rounded-2xl bg-zinc-900/60 p-5 hover:bg-zinc-900 transition">
          <div className="text-xl font-semibold">USD → SSP (Official)</div>
          <div className="opacity-75 text-sm mt-1">Today’s rate + full history</div>
        </a>
        <a href="/usd-to-sxp" className="rounded-2xl bg-zinc-900/60 p-5 hover:bg-zinc-900 transition">
          <div className="text-xl font-semibold">USD → SXP (Black Market)</div>
          <div className="opacity-75 text-sm mt-1">Today’s rate + full history</div>
        </a>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-semibold mb-2">Endpoints</h2>
        <pre className="bg-zinc-900/60 rounded-xl p-4 overflow-x-auto text-sm">
GET /api/v1/currencies
GET /api/v1/latest?base=SSP&symbols=USD,EUR
GET /api/v1/convert?from=USD&to=SSP&amount=100
GET /api/v1/timeseries?start=YYYY-MM-DD&end=YYYY-MM-DD&base=SSP&symbols=USD
GET /api/v1/status
POST /api/v1/admin/rates   (CSV or JSON)   header: x-internal-admin-token
        </pre>
      </div>
    </main>
  );
}
