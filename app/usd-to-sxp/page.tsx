import { getSupabaseService } from '@/lib/supabase';
import Converter from '@/components/Converter';
import HistoryTable from '@/components/HistoryTable';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const res = await fetch('https://fx.savvyrilla.tech/api/v1/latest?base=SXP&symbols=USD', { cache: 'no-store' })
  const data = await res.json()
  const usdToSsp = data?.rates?.USD ? (1 / data.rates.USD).toFixed(2) : '—'

  return {
    title: `1 USD = ${usdToSxp} SXP — Today (Official) | Savvy Rilla FX`,
    description: `Live USD to SXP official exchange rate: 1 USD = ${usdToSxp} SXP (today). See full history and daily trends on Savvy Rilla FX.`,
    alternates: { canonical: 'https://fx.savvyrilla.tech/usd-to-sxp' },
    openGraph: {
      title: `1 USD = ${usdToSxp} SXP — Official Rate`,
      description: `Live USD to SXP official exchange rate with full historical data.`,
      url: 'https://fx.savvyrilla.tech/usd-to-sxp',
      siteName: 'Savvy Rilla FX',
      images: ['/logo.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `1 USD = ${usdToSxp} SSP — Official Rate`,
      description: `Live USD to SXP official exchange rate from Savvy Rilla FX.`,
      images: ['/logo.png'],
    },
  }
}

type Row = { rate_date: string; rate: number };

function exchangeRateSchemaSxp(usdToSxp: number, date: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ExchangeRateSpecification',
    name: 'USD to SXP exchange rate (black market)',
    description: `1 USD equals ${usdToSxp.toLocaleString()} SXP on ${date}`,
    currency: 'USD',
    currentExchangeRate: { '@type': 'UnitPriceSpecification', price: usdToSxp, priceCurrency: 'SXP' },
    validFrom: date,
    provider: { '@type': 'Organization', name: 'Savvy Rilla FX', url: 'https://fx.savvyrilla.tech', logo: 'https://fx.savvyrilla.tech/logo.png' },
  };
}

function Spark({ points }: { points: number[] }) {
  if (!points.length) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const w = 340, h = 64, p = 6;
  const step = (w - 2 * p) / Math.max(points.length - 1, 1);
  const y = (v: number) => h - p - ((v - min) / (max - min || 1)) * (h - 2 * p);
  const d = points.map((v, i) => `${i ? 'L' : 'M'} ${p + i * step} ${y(v)}`).join(' ');
  return <svg width={w} height={h} className="opacity-90"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

export default async function Page() {
  const s = getSupabaseService();

  const { data: latest } = await s
    .from('fx_latest').select('rate_date, rate').eq('base', 'SXP').eq('quote', 'USD').maybeSingle();

  const { data: hist } = await s
    .from('fx_rates').select('rate_date, rate').eq('base', 'SXP').eq('quote', 'USD')
    .order('rate_date', { ascending: true });

  const date = latest?.rate_date ?? new Date().toISOString().slice(0, 10);
  const usdToSxp = latest?.rate ? Number((1 / Number(latest.rate)).toFixed(4)) : null;

  const all = (hist ?? []).map((r: Row) => ({ date: r.rate_date, value: Number((1 / Number(r.rate)).toFixed(4)) }));
  const spark = all.slice(-180).map(p => p.value);

  return (
    <main className="min-h-dvh p-8 text-white bg-black">
      {usdToSxp && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(exchangeRateSchemaSxp(usdToSxp, date)) }} />
      )}

      <h1 className="text-3xl font-bold">
  1 USD = {usdToSxp?.toLocaleString()} SXP — Today (Official)
</h1>

      {usdToSxp ? (
        <>
          <p className="mt-6 text-4xl">1 USD = <strong>{usdToSxp.toLocaleString()}</strong> SXP</p>
          <p className="mt-2 opacity-80">Black-market rate on {date}</p>

          <Converter
            rate={usdToSxp}
            fromLabel="United States Dollar (USD)"
            toLabel="South Sudan Pound (Black Market, SXP)"
            defaultAmount={1}
          />

          <div className="mt-8">
            <div className="text-sm opacity-80 mb-2">History</div>
            <div className="text-emerald-400"><Spark points={spark} /></div>
          </div>

          <HistoryTable rows={all} valueLabel="1 USD in SXP" />

          <p className="mt-8 opacity-80">
            Official rate? <a className="underline" href="/usd-to-ssp">USD → SSP</a>
          </p>
        </>
      ) : (
        <p className="mt-6 opacity-80">Rate unavailable right now.</p>
      )}
    </main>
  );
}
