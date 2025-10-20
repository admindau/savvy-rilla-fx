// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

const siteName = 'Savvy Rilla FX';
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://fx.savvyrilla.tech';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: `${siteName} — Immaculate FX API`,
  description:
    'A fast, transparent, SSP-first foreign exchange API with official and black-market rates, history, and endpoints.',
  applicationName: siteName,
  openGraph: {
    title: `${siteName} — Immaculate FX API`,
    description:
      'SSP-first FX API: official and black-market rates, history, and developer endpoints.',
    url: baseUrl,
    siteName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} — Immaculate FX API`,
    description:
      'SSP-first FX API: official and black-market rates, history, and developer endpoints.',
  },
  icons: {
    icon: '/logo.png', // your logo exists in /public/logo.png
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="srfx-body">
        {children}
      </body>
    </html>
  );
}
