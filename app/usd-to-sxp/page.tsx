// app/usd-to-sxp/page.tsx
import { getSupabaseService } from '@/lib/supabase'
export const revalidate = 300
export const dynamic = 'force-dynamic'

export default async function Page() {
  const s = getSupabaseService()
  const { data } = await s.from('fx_latest')
    .select('rate_date, rate')
    .eq('base','SXP').eq('quote','USD').maybeSingle()

  const date = data?.rate_date ?? new Date().toISOString().slice(0,10)
  const rateSXPperUSD = data?.rate ? Number((1/Number(data.rate)).toFixed(4)) : null

  return (
    <main className="min-h-dvh p-8 text-white bg-black">
      <h1 className="text-3xl font-bold">USD to SXP (Black Market) — Today</h1>
      {rateSXPperUSD ? (
        <>
          <p className="mt-6 text-4xl">
            1 USD = <strong>{rateSXPperUSD.toLocaleString()}</strong> SXP
          </p>
          <p className="mt-2 opacity-80">Black-market rate on {date}</p>
        </>
      ) : <p className="mt-6 opacity-80">Rate unavailable right now.</p>}
    </main>
  )
}
