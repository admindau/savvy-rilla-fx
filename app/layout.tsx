// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata = {
  title: 'Savvy Rilla FX — USD→SSP (Official) & USD→SXP (Black Market)',
  description: 'Live USD to SSP and SXP exchange rates with full historical data for South Sudan. Structured for Google rich results.',
  openGraph: { title: 'Savvy Rilla FX', description: 'USD→SSP & USD→SXP with history', url: 'https://fx.savvyrilla.tech', siteName: 'Savvy Rilla FX', images: ['/opengraph-image.png'] },
  alternates: { canonical: 'https://fx.savvyrilla.tech' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
