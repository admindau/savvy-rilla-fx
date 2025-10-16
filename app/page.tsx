import Image from 'next/image'

export const metadata = {
  title: 'Savvy Rilla FX API',
  description: 'SSP-first exchange rate API by Savvy Rilla Technologies',
  openGraph: {
    title: 'Savvy Rilla FX API',
    description: 'SSP-first exchange rate API by Savvy Rilla Technologies',
    images: ['/opengraph-image.png'],
  },
}

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-8 text-white bg-black">
      <div className="max-w-3xl text-center space-y-6">
        <Image src="/branding/logo.png" alt="Savvy Rilla" width={220} height={220} priority />
        <h1 className="text-3xl font-bold">Savvy Rilla FX API</h1>
        <p className="opacity-80">
          Immaculate, SSP‑first FX API. Endpoints:
        </p>
        <pre className="bg-neutral-900 p-4 rounded-xl text-left overflow-auto">
{`GET /api/v1/currencies
GET /api/v1/latest?base=SSP&symbols=USD,EUR
GET /api/v1/convert?from=USD&to=SSP&amount=100
GET /api/v1/timeseries?start=YYYY-MM-DD&end=YYYY-MM-DD&base=SSP&symbols=USD
GET /api/v1/status
POST /api/v1/admin/rates  (CSV or JSON)  header: x-internal-admin-token`}
        </pre>
      </div>
    </main>
  )
}
