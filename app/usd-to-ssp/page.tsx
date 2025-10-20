import { getSupabaseService } from '@/lib/supabase';
import Converter from '@/components/Converter';
import HistoryTable from '@/components/HistoryTable';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

type RateRow = { rate_date: string; rate: number };

export async function generateMetadata() {
  try {
    const s = getSupabaseService();
    const res = await s
      .from('fx_rates')
      .select('rate_date, rate')
      .eq('base', 'SSP')
      .eq('quote', 'USD')
      .order('rate_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (res.error) throw res.error;
    const latest = (res.data ?? null) as RateRow | null;
    const rate = latest?.rate ? (1 / Number(latest.rate)).toFixed(2) : undefined;
    const title = rate
      ? `1 USD = ${rate} SSP — Today (Official) | Savvy Rilla FX`
      : 'USD to SSP — Today (Official) | Savvy Rilla FX';
    return {
      title,
      description: rate
        ? `Live USD to SSP official exchange rate: 1 USD = ${rate} SSP (today).`
        : 'Live USD to SSP official exchange rate and full history.',
      alternates: { canonical: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech') + '/usd-to-ssp' },
      openGraph: { title, url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech') + '/usd-to-ssp', images: ['/logo.png'] },
      twitter: { card: 'summary_large_image', title, images: ['/logo.png'] },
    };
  } catch {
    return {
      title: 'USD to SSP — Today (Official) | Savvy Rilla FX',
      description: 'Live USD to SSP official exchange rate and full history.',
      openGraph: { images: ['/logo.png'] },
      twitter: { card: 'summary_large_image', images: ['/logo.png'] },
    };
  }
}

function exchangeRateSchema(usdToSsp: number, date: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ExchangeRateSpecification',
    name: 'USD to SSP exchange rate (official)',
    description: `1 USD equals ${usdToSsp.toLocaleString()} SSP on ${date}`,
    currency: 'USD',
    currentExchangeRate: {
      '@type': 'UnitPriceSpecification',
      price: usdToSsp,
      priceCurrency: 'SSP',
    },
    validFrom: date,
    provider: {
      '@type': 'Organization',
      name: 'Savvy Rilla FX',
      url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech',
      logo: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech') + '/logo.png',
    },
  };
}

function Spark({ points }: { points: number[] }) {
  if (!points.length) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const w = 420, h = 64, p = 6;
  const step = (w - 2 * p) / Math.max(points.length - 1, 1);
  const y = (v: number) => h - p - ((v - min) / (max - min || 1)) * (h - 2 * p);
  const d = points.map((v, i) => `${i ? 'L' : 'M'} ${p + i * step} ${y(v)}`).join(' ');
  return <svg width={w} height={h} className="spark"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

export default async function Page() {
  const s = getSupabaseService();

  const latestRes = await s
    .from('fx_rates')
    .select('rate_date, rate')
    .eq('base', 'SSP')
    .eq('quote', 'USD')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRes.error) throw latestRes.error;
  const latest = (latestRes.data ?? null) as RateRow | null;

  const histRes = await s
    .from('fx_rates')
    .select('rate_date, rate')
    .eq('base', 'SSP')
    .eq('quote', 'USD')
    .order('rate_date', { ascending: true });

  if (histRes.error) throw histRes.error;
  const hist = (histRes.data ?? []) as RateRow[];

  const date = latest?.rate_date ?? new Date().toISOString().slice(0, 10);
  const usdToSsp = latest?.rate ? Number((1 / Number(latest.rate)).toFixed(4)) : null;

  const all = hist.map((r) => ({ date: r.rate_date, value: Number((1 / Number(r.rate)).toFixed(4)) }));
  const spark = all.slice(-180).map((p) => p.value);

  return (
    <main className="container">
      <div className="h1">1 USD = {usdToSsp?.toLocaleString()} SSP — Today (Official)</div>
      <div className="muted">Official rate on {date}</div>

      {usdToSsp && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(exchangeRateSchema(usdToSsp, date)) }} />
      )}

      {usdToSsp ? (
        <>
          <Converter rate={usdToSsp} fromLabel="United States Dollar (USD)" toLabel="South Sudanese Pound (SSP)" defaultAmount={1} />
          <div style={{ marginTop: 18 }}>
            <div className="muted">History</div>
            <Spark points={spark} />
          </div>
          <HistoryTable rows={all} valueLabel="1 USD in SSP" />
          <p className="muted" style={{ marginTop: 20 }}>Black market rate? <a href="/usd-to-sxp">USD → SXP</a></p>
        </>
      ) : (
        <p className="muted" style={{ marginTop: 14 }}>Rate unavailable right now.</p>
      )}
    </main>
  );
}
