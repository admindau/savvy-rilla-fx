// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Savvy Rilla FX API',
  description: 'SSP-first exchange rate API by Savvy Rilla Technologies',
  openGraph: {
    title: 'Savvy Rilla FX API',
    description: 'SSP-first exchange rate API by Savvy Rilla Technologies',
    images: ['/opengraph-image.png'],
  },
  icons: [{ rel: 'icon', url: '/icon.png' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
