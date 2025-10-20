export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech'),
  title: 'Savvy Rilla FX',
  description: 'Immaculate, SSP-first FX API built for transparency and access.',
  icons: [{ rel: 'icon', url: '/logo.png' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Savvy Rilla Technologies',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech',
    logo: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech') + '/logo.png',
  };

  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        {children}
        <style>{`
          :root { color-scheme: dark; }
          * { box-sizing: border-box; }
          html, body { margin:0; padding:0; background:#000; color:#fff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji','Segoe UI Emoji'; }
          a { color:#facc15; text-decoration: none; }
          a:hover { text-decoration: underline; }
          code { background:#090909; padding:2px 6px; border-radius:6px; }
          .container { max-width: 1000px; margin: 0 auto; padding: 24px; }
          .card { background:#0b0b0b; border:1px solid #111; border-radius:14px; padding:16px; }
          .row { display:flex; gap:16px; flex-wrap:wrap; }
          .col { flex:1 1 320px; }
          .muted { color:#a1a1aa; }
          .h1 { font-size:32px; font-weight:800; letter-spacing:-0.02em; margin: 8px 0 2px; }
          .h2 { font-size:22px; font-weight:700; margin: 8px 0; }
          .btn { background:#111; border:1px solid #1a1a1a; padding:10px 14px; border-radius:10px; color:#fff; }
          .btn:hover { background:#151515; }
          .table { width:100%; border-collapse: separate; border-spacing: 0 8px; }
          .table th { text-align:left; font-weight:600; color:#a1a1aa; font-size:13px; }
          .table td, .table th { padding:8px 10px; }
          .table tr td { background:#0b0b0b; border:1px solid #111; }
          .right { text-align:right; }
          .footer { margin-top:28px; font-size:12px; color:#9ca3af; }
          .logo { width:58px; height:58px; border-radius:10px; box-shadow: 0 8px 20px rgba(0,0,0,.35); }
          .header { display:flex; align-items:center; gap:12px; margin-bottom: 12px; }
          .spark { color:#34d399; }
          .mono { font-variant-numeric: tabular-nums; }
        `}</style>
      </body>
    </html>
  );
}
