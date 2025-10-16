export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Savvy Rilla Technologies"
        width={160}
        height={160}
        className="mb-6 opacity-90"
      />

      {/* Title & tagline */}
      <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
        Savvy Rilla FX API
      </h1>
      <p className="text-zinc-300 mb-8">
        Immaculate, SSP-first FX API built for transparency and access.
      </p>

      {/* Links to key pages */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl w-full">
        <a
          href="/usd-to-ssp"
          className="rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 transition p-5"
        >
          <div className="text-xl font-semibold text-white">
            USD → SSP (Official)
          </div>
          <div className="text-sm opacity-75 mt-1">Today’s rate + full history</div>
        </a>

        <a
          href="/usd-to-sxp"
          className="rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 transition p-5"
        >
          <div className="text-xl font-semibold text-white">
            USD → SXP (Black Market)
          </div>
          <div className="text-sm opacity-75 mt-1">Today’s rate + full history</div>
        </a>
      </div>

      {/* Endpoints */}
      <div className="mt-10 max-w-3xl w-full text-left">
        <h2 className="text-2xl font-semibold mb-2 text-center sm:text-left">
          Endpoints
        </h2>
        <pre className="bg-zinc-900/60 rounded-xl p-4 overflow-x-auto text-sm leading-relaxed text-zinc-300">
GET /api/v1/currencies
GET /api/v1/latest?base=SSP&symbols=USD,EUR
GET /api/v1/convert?from=USD&to=SSP&amount=100
GET /api/v1/timeseries?start=YYYY-MM-DD&end=YYYY-MM-DD&base=SSP&symbols=USD
GET /api/v1/status
POST /api/v1/admin/rates   (CSV or JSON)   header: x-internal-admin-token
        </pre>
      </div>

      {/* Footer */}
      <footer className="mt-10 text-xs text-zinc-500">
        © {new Date().getFullYear()} Savvy Rilla Technologies
      </footer>
    </main>
  );
}
