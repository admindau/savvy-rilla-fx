// app/usd-to-ssp/page.tsx
import { getSupabaseService } from '@/lib/supabase'

export const revalidate = 300;           // refresh every 5 min
export const dynamic = 'force-dynamic';  // always build at request time

function jsonLd(rateSSPperUSD: number, date: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ExchangeRateSpecification",
    name: "USD to SSP exchange rate (official)",
    description: `1 USD to SSP exchange rate on ${date}`,
    currency: "USD",
    currentExchangeRate: {
      "@type": "UnitPriceSpecification",
      price: rateSSPperUSD,     // SSP per 1 USD
      priceCurrency: "SSP"
    },
    validFrom: date
  }
}

export default async function Page() {
  const supabase = getSupabaseService()
  const { data } = await supabase
    .from('fx_latest')
    .select('rate_date, rate')
    .eq('base','SSP')
    .eq('quote','USD')
    .maybeSingle()

  const date = data?.rate_date ?? new Date().toISOString().slice(0,10)
  const rateSSPperUSD = data?.rate ? Number((1/Number(data.rate)).toFixed(4)) : null

  return (
    <main className="min-h-dvh p-8 text-white bg-black">
      {rateSSPperUSD && (
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(rateSSPperUSD, date)) }} />
      )}
      <h1 className="text-3xl font-bold">USD to SSP — Today</h1>
      {rateSSPperUSD ? (
        <>
          <p className="mt-6 text-4xl">
            1 USD = <strong>{rateSSPperUSD.toLocaleString()}</strong> SSP
          </p>
          <p className="mt-2 opacity-80">Official rate on {date}</p>
          <div className="mt-8 opacity-80">
            <h2 className="text-xl font-semibold mb-2">Quick conversions</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>10 USD = {(rateSSPperUSD*10).toLocaleString()} SSP</li>
              <li>50 USD = {(rateSSPperUSD*50).toLocaleString()} SSP</li>
              <li>100 USD = {(rateSSPperUSD*100).toLocaleString()} SSP</li>
            </ul>
          </div>
        </>
      ) : (
        <p className="mt-6 opacity-80">Rate unavailable right now.</p>
      )}
    </main>
  )
}
