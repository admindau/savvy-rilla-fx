export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-4xl flex flex-col items-center text-center">
        {/* logo */}
        <img
          src="/logo.png"
          alt="Savvy Rilla Technologies"
          width={160}
          height={160}
          className="mb-6 opacity-95"
        />

        {/* title + tagline */}
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span className="text-amber-400">Savvy Rilla</span> FX API
        </h1>
        <p className="mt-2 text-zinc-300">
          Immaculate, SSP-first FX API built for transparency and access.
        </p>

        {/* links */}
        <div className="mt-8 grid gap-4 w-full sm:grid-cols-2 text-left">
          <a
            href="/usd-to-ssp"
            className="block rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 transition p-5 ring-1 ring-zinc-800"
          >
            <div className="text-xl font-semibold">
              USD → SSP <span className="text-amber-400">(Official)</span>
            </div>
            <div className="opacity-75 text-sm mt-1">Today’s rate + full history</div>
          </a>

          <a
            href="/usd-to-sxp"
            className="block rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 transition p-5 ring-1 ring-zinc-800"
          >
            <div className="text-xl font-semibold">
              USD → SXP <span className="text-amber-400">(Black Market)</span>
            </div>
            <div className="opacity-75 text-sm mt-1">Today’s rate + full history</div>
          </a>
        </div>

        {/* endpoints */}
        <div className="mt-10 w-full">
          <h2 className="text-2xl font-semibold mb-3">
            <span className="text-amber-400">Endpoints</span>
          </h2>
          <pre className="bg-zinc-900/70 rounded-xl p-4 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap break-words ring-1 ring-zinc-800">
GET /api/v1/currencies
GET /api/v1/latest?base=SSP&symbols=USD,EUR
GET /api/v1/convert?from=USD&to=SSP&amount=100
GET /api/v1/timeseries?start=YYYY-MM-DD&end=YYYY-MM-DD&base=SSP&symbols=USD
GET /api/v1/status
POST /api/v1/admin/rates   (CSV or JSON)   header: x-internal-admin-token
          </pre>
        </div>

        {/* footer */}
        <footer className="mt-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} Savvy Rilla Technologies
        </footer>
      </div>
    </main>
  );
}
