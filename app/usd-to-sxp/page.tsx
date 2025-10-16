// app/usd-to-sxp/page.tsx
import { getSupabaseService } from '@/lib/supabase'
export const revalidate = 300
export const dynamic = 'force-dynamic'

type Row = { rate_date: string; rate: number }

export default async function Page() {
  const s = getSupabaseService()

  const { data: latest } = await s
    .from('fx_latest')
    .select('rate_date, rate')
    .eq('base', 'SXP')
    .eq('quote', 'USD')
    .maybeSingle()

  const { data: hist } = await s
    .from('fx_rates')
    .select('rate_date, rate')
    .eq('base', 'SXP')
    .eq('quote', 'USD')
    .gte('rate_date', new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10))
    .lte('rate_date', new Date().toISOString().slice(0, 10))
    .order('rate_date', { ascending: true })

  const date = latest?.rate_date ?? new Date().toISOString().slice(0, 10)
  const usdToSxp = latest?.rate ? Number((1 / Number(latest.rate)).toFixed(4)) : null
  const series = (hist ?? []).map((r: Row) => ({
    date: r.rate_date,
    usdToSxp: Number((1 / Number(r.rate)).toFixed(4)),
  }))

  return (
    <main className="min-h-dvh p-8 text-white bg-black">
      <h1 className="text-3xl font-bold">USD to SXP — Today (Black Market)</h1>
      {usdToSxp ? (
        <>
          <p className="mt-6 text-4xl">
            1 USD = <strong>{usdToSxp.toLocaleString()}</strong> SXP
          </p>
          <p className="mt-2 opacity-80">Black-market rate on {date}</p>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Last 30 days</h2>
            {/* simple sparkline */}
            <svg width="260" height="48" aria-hidden="true">
              {(() => {
                const points = series.map(s => s.usdToSxp)
                if (!points.length) return null
                const min = Math.min(...points), max = Math.max(...points)
                const pad = 4, w = 260, h = 48
                const step = (w - 2 * pad) / Math.max(points.length - 1, 1)
                const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad)
                const d = points.map((v, i) => `${i ? 'L' : 'M'} ${pad + i * step} ${y(v)}`).join(' ')
                return <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
              })()}
            </svg>

            <table className="mt-4 w-full text-sm border-separate border-spacing-y-1">
              <thead className="opacity-70"><tr><th className="text-left">Date</th><th className="text-right">1 USD in SXP</th></tr></thead>
              <tbody>
                {[...series].reverse().slice(0, 14).map((r) => (
                  <tr key={r.date}><td>{r.date}</td><td className="text-right">{r.usdToSxp.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : <p className="mt-6 opacity-80">Rate unavailable.</p>}
    </main>
  )
}
