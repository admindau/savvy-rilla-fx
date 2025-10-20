// app/page.tsx
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="srfx-wrap">
      {/* Hero */}
      <header className="srfx-hero">
        <div className="srfx-hero-left">
          <Image
            src="/logo.png"
            alt="Savvy Rilla Technologies"
            width={120}
            height={120}
            priority
            className="srfx-logo"
          />
          <div>
            <h1 className="srfx-title">Savvy Rilla FX API</h1>
            <p className="srfx-subtitle">
              Immaculate, SSP-first FX API built for transparency and access.
            </p>
            <div className="srfx-cta">
              <Link href="/usd-to-ssp" className="srfx-btn">
                USD → SSP (Official)
              </Link>
              <Link href="/usd-to-sxp" className="srfx-btn srfx-btn-alt">
                USD → SXP (Black Market)
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Links */}
      <section className="srfx-links">
        <Link className="srfx-link" href="/usd-to-ssp">
          Today’s USD→SSP rate + full history
        </Link>
        <Link className="srfx-link" href="/usd-to-sxp">
          Today’s USD→SXP rate + full history
        </Link>
      </section>

      {/* Endpoints */}
      <section className="srfx-section">
        <h2 className="srfx-h2">Endpoints</h2>

        <div className="srfx-grid">
          <article className="srfx-card">
            <h3>List currencies</h3>
            <code>GET /api/v1/currencies</code>
            <p className="srfx-help">ISO list with display names.</p>
          </article>

          <article className="srfx-card">
            <h3>Latest rates</h3>
            <code>GET /api/v1/latest?base=SSP&amp;symbols=USD,EUR</code>
            <p className="srfx-help">
              Returns latest value(s) for requested symbols.
            </p>
          </article>

          <article className="srfx-card">
            <h3>Convert</h3>
            <code>GET /api/v1/convert?from=USD&amp;to=SSP&amp;amount=100</code>
            <p className="srfx-help">Server-side conversion with auditability.</p>
          </article>

          <article className="srfx-card">
            <h3>Time series</h3>
            <code>
              GET /api/v1/timeseries?start=YYYY-MM-DD&amp;end=YYYY-MM-DD&amp;base=SSP&amp;symbols=USD
            </code>
            <p className="srfx-help">Historical values over a date range.</p>
          </article>

          <article className="srfx-card">
            <h3>Status</h3>
            <code>GET /api/v1/status</code>
            <p className="srfx-help">Last refresh date, health, version.</p>
          </article>

          <article className="srfx-card">
            <h3>Admin: ingest daily</h3>
            <code>POST /api/v1/admin/rates</code>
            <p className="srfx-help">
              JSON/CSV body. Header: <b>x-internal-admin-token</b>.
            </p>
          </article>
        </div>
      </section>

      <footer className="srfx-footer">
        © {new Date().getFullYear()} Savvy Rilla Technologies
      </footer>
    </main>
  );
}
