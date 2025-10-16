// app/usd-to-ssp/page.tsx
import { getSupabaseService } from '@/lib/supabase'

export const revalidate = 300
export const dynamic = 'force-dynamic'

type Row = { rate_date: string; rate: number }

function ldForCurrent(usdToSsp: number, date: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ExchangeRateSpecification',
    name: 'USD to SSP exchange rate (official)',
    description: `1 USD to SSP exchange rate on ${date}`,
    currency: 'USD',
    currentExchangeRate: {
      '@type': 'UnitPriceSpecification',
      price: usdToSsp,
      priceCurrency: 'SSP',
    },
    validFrom: date,
  }
}

function ldForHistory(series: { date: string; usdToSsp: number }[]) {
  // Represent history as an ItemList of ExchangeRateSpecification
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'USD to SSP historical exchange rates (last 30 days)',
    itemListElement: series.map((p, i) => ({
      '@type': 'ExchangeRateSpecification',
      position: i + 1,
      currency: 'USD',
      currentExchangeRate: {
        '@type': 'UnitPriceSpecification',
        price: p.usdToSsp,
        priceCurrency: 'SSP',
      },
      validFrom: p.date,
      name: `USD to SSP on ${p.date}`,
    })),
  }
}

function Sparkline({ points }: { points: number[] }) {
  if (!points.length) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const w = 260
  const h = 48
  const pad = 4
  const norm = (v: number) =>
    h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad)
  const step = (w - 2 * pad) / Math.max(points.length - 1, 1)
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * step} ${norm(v)}`)
    .join(' ')
  return (
    <svg width={w} height={h} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

export default async function Page() {
  const s = getSupabaseService()

  // Latest (fx_latest stores 1 SSP = rate USD, so invert)
  const { data: latest } = await s
    .from('fx_latest')
    .select('rate_date, rate')
    .eq('base', 'SSP')
    .eq('quote', 'USD')
    .maybeSingle()

  // 30-day history (same inversion)
  const { data: hist } = await s
    .from('fx_rates')
    .select('rate_date, rate')
    .eq('base', 'SSP')
    .eq('quote', 'USD')
    .gte('rate_date', new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10))
    .lte('rate_date', new Date().toISOString().slice(0, 10))
    .order('rate_date', { ascending: true })

  const date = latest?.rate_date ?? new Date().toISOString().slice(0, 10)
  const usdToSsp = latest?.rate ? Number((1 / Number(latest.rate)).toFixed(4)) : null

  const series =
    (hist ?? []).map((r: Row) => ({
      date: r.rate_date,
      usdToSsp: Number((1 / Number(r.rate)).toFixed(4)),
    })) || []

  return (
    <main className="min-h-dvh p-8 text-white bg-black">
      {/* JSON-LD for current + history */}
      {usdToSsp && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldForCurrent(usdToSsp, date)) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldForHistory(series)) }} />
        </>
      )}

      <h1 className="text-3xl font-bold">USD to SSP — Today (Official)</h1>

      {usdToSsp ? (
        <>
          <p className="mt-6 text-4xl">
            1 USD = <strong>{usdToSsp.toLocaleString()}</strong> SSP
          </p>
          <p className="mt-2 opacity-80">Official rate on {date}</p>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Last 30 days</h2>
            <div className="text-gray-300">
              <Sparkline points={series.map(s => s.usdToSsp)} />
            </div>
            <table className="mt-4 w-full text-sm border-separate border-spacing-y-1">
              <thead className="opacity-70">
                <tr><th className="text-left">Date</th><th className="text-right">1 USD in SSP</th></tr>
              </thead>
              <tbody>
                {[...series].reverse().slice(0, 14).map((row) => (
                  <tr key={row.date}>
                    <td>{row.date}</td>
                    <td className="text-right">{row.usdToSsp.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-8 opacity-80">
              <h3 className="text-lg font-semibold mb-2">Quick conversions</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>10 USD = {(usdToSsp * 10).toLocaleString()} SSP</li>
                <li>50 USD = {(usdToSsp * 50).toLocaleString()} SSP</li>
                <li>100 USD = {(usdToSsp * 100).toLocaleString()} SSP</li>
              </ul>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-6 opacity-80">Rate unavailable right now.</p>
      )}
    </main>
  )
}
