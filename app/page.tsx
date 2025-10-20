export default function Page() {
  return (
    <main className="container">
      <div className="header">
        <img src="/logo.png" alt="Savvy Rilla Technologies" className="logo" />
        <div>
          <div className="h1"><span style={{color:'#facc15'}}>Savvy Rilla</span> FX API</div>
          <div className="muted">Immaculate, SSP-first FX API built for transparency and access.</div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <a href="/usd-to-ssp" className="col card" style={{ textDecoration:'none' }}>
          <div className="h2">USD → SSP <span style={{color:'#facc15'}}>(Official)</span></div>
          <div className="muted">Today’s rate + full history</div>
        </a>
        <a href="/usd-to-sxp" className="col card" style={{ textDecoration:'none' }}>
          <div className="h2">USD → SXP <span style={{color:'#facc15'}}>(Black Market)</span></div>
          <div className="muted">Today’s rate + full history</div>
        </a>
      </div>

      <section style={{ marginTop: 24 }}>
        <div className="h2"><span style={{color:'#facc15'}}>Endpoints</span></div>
        <ul style={{ listStyle:'disc', paddingLeft: '20px', lineHeight: '1.9' }}>
          <li><code>GET</code> <code>/api/v1/currencies</code></li>
          <li><code>GET</code> <code>/api/v1/latest?base=SSP&amp;symbols=USD,EUR</code></li>
          <li><code>GET</code> <code>/api/v1/convert?from=USD&amp;to=SSP&amp;amount=100</code></li>
          <li><code>GET</code> <code>/api/v1/timeseries?start=YYYY-MM-DD&amp;end=YYYY-MM-DD&amp;base=SSP&amp;symbols=USD</code></li>
          <li><code>GET</code> <code>/api/v1/status</code></li>
          <li><code>POST</code> <code>/api/v1/admin/rates</code> <span className="muted">(JSON) header:</span> <code>x-internal-admin-token</code></li>
        </ul>
      </section>

      <div className="footer">© {new Date().getFullYear()} Savvy Rilla Technologies</div>
    </main>
  );
}
