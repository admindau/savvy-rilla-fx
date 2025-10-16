// app/usd-to-sxp/page.tsx
import { getSupabaseService } from '@/lib/supabase'

export const revalidate = 300
export const dynamic = 'force-dynamic'

type Row = { rate_date: string; rate: number }

function ldCurrent(usdToSxp: number, date: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ExchangeRateSpecification',
    name: 'USD to SXP exchange rate (official)',
    description: `1 USD to SXP exchange rate on ${date}`,
    currency: 'USD',
    currentExchangeRate: {
      '@type': 'UnitPriceSpecification',
      price: usdTosxp,
      priceCurrency: 'sxp',
    },
    validFrom: date,
  }
}
function ldFaq(usdTosxp: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How much is $1 in sxp?', acceptedAnswer: { '@type': 'Answer', text: `1 USD equals ${usdTosxp.toLocaleString()} sxp (official).` } },
      { '@type': 'Question', name: 'How much is $10 in sxp?', acceptedAnswer: { '@type': 'Answer', text: `10 USD equals ${(usdTosxp*10).toLocaleString()} sxp (official).` } },
      { '@type': 'Question', name: 'How much is $100 in sxp?', acceptedAnswer: { '@type': 'Answer', text: `100 USD equals ${(usdTosxp*100).toLocaleString()} sxp (official).` } },
    ],
  }
}

function Spark({ points }: { points: number[] }) {
  if (!points.length) return null
  const min = Math.min(...points), max = Math.max(...points)
  const w = 340, h = 64, p = 6
  const step = (w - 2*p) / Math.max(points.length - 1, 1)
  const y = (v: number) => h - p - ((v - min)/(max - min || 1))*(h - 2*p)
  const d = points.map((v,i)=>`${i?'L':'M'} ${p+i*step} ${y(v)}`).join(' ')
  return <svg width={w} height={h} className="opacity-90"><path d={d} fill="none" stroke="currentColor" strokeWidth="2"/></svg>
}

export default async function Page() {
  const s = getSupabaseService()

  // latest (invert: fx tables store 1 sxp = r USD)
  const { data: latest } = await s
    .from('fx_latest').select('rate_date, rate')
    .eq('base','SXP').eq('quote','USD').maybeSingle()

  // FULL history (no date filter), ordered asc
  const { data: hist } = await s
    .from('fx_rates').select('rate_date, rate')
    .eq('base','SXP').eq('quote','USD')
    .order('rate_date', { ascending: true })

  const date = latest?.rate_date ?? new Date().toISOString().slice(0,10)
  const usdToSxp = latest?.rate ? Number((1/Number(latest.rate)).toFixed(4)) : null

  const all = (hist ?? []).map((r: Row) => ({
    date: r.rate_date,
    usdToSxp: Number((1/Number(r.rate)).toFixed(4)),
  }))

  // keep sparkline light: last up to 180 points
  const spark = all.slice(-180).map(p=>p.usdToSxp)

  return (
    <main className="min-h-dvh p-8 text-white bg-black">
      {usdToSxp && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCurrent(usdToSxp, date)) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq(usdToSxp)) }} />
        </>
      )}

      <h1 className="text-3xl font-bold">USD to SXP — Today (Official)</h1>

      {usdToSxp ? (
        <>
          <p className="mt-6 text-4xl">1 USD = <strong>{usdToSxp.toLocaleString()}</strong> SXP</p>
          <p className="mt-2 opacity-80">Official rate on {date}</p>

          {/* converter */}
          <div className="mt-6 grid gap-3 w-full max-w-xl">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/60 rounded-xl p-3">
                <div className="text-xs opacity-70">Amount</div>
                <input id="amt" defaultValue={1} className="w-full bg-transparent text-2xl outline-none" />
                <div className="text-xs opacity-70 mt-1">United States Dollar (USD)</div>
              </div>
              <div className="bg-zinc-900/60 rounded-xl p-3">
                <div className="text-xs opacity-70">Converted</div>
                <output id="out" className="block text-2xl">{usdToSxp.toLocaleString()}</output>
                <div className="text-xs opacity-70 mt-1">South Sudanese Pound (SXP)</div>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{__html:`
              const a=document.getElementById('amt'), o=document.getElementById('out'), r=${usdToSxp};
              a?.addEventListener('input',()=>{ const v=parseFloat(a.value||'0'); o.textContent=(v*r).toLocaleString();});
            `}}/>
          </div>

          {/* sparkline */}
          <div className="mt-8">
            <div className="text-sm opacity-80 mb-2">History</div>
            <div className="text-emerald-400"><Spark points={spark} /></div>
          </div>

          {/* table: last 14 by default, expandable to ALL */}
          <div className="mt-6">
            <table className="w-full text-sm border-separate border-spacing-y-1">
              <thead className="opacity-70"><tr><th className="text-left">Date</th><th className="text-right">1 USD in SXP</th></tr></thead>
              <tbody id="rows">
                ${[...all].reverse().slice(0,14).map(r =>
                  `<tr><td>${r.date}</td><td class="text-right">${r.usdToSxp.toLocaleString()}</td></tr>`
                ).join('')}
              </tbody>
            </table>
            <button id="showAll" className="mt-3 underline">Show full history</button>
            <script dangerouslySetInnerHTML={{__html:`
              document.getElementById('showAll')?.addEventListener('click',()=>{
                const rows=document.getElementById('rows');
                const data=${JSON.stringify([...all].reverse())};
                rows.innerHTML=data.map(r=>\`<tr><td>\${r.date}</td><td class="text-right">\${Number(r.usdToSxp).toLocaleString()}</td></tr>\`).join('');
              });
            `}}/>
          </div>

          <p className="mt-8 opacity-80">
            Black market rate? <a href="/usd-to-sxp" className="underline">USD → SXP</a>
          </p>
        </>
      ) : (
        <p className="mt-6 opacity-80">Rate unavailable right now.</p>
      )}
    </main>
  )
}
