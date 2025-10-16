export const metadata = {
  title: 'Savvy Rilla FX',
  description: 'Immaculate, SSP-first FX API built for transparency and access.',
  icons: [{ rel: 'icon', url: '/logo.png' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Savvy Rilla Technologies',
    url: 'https://fx.savvyrilla.tech',
    logo: 'https://fx.savvyrilla.tech/logo.png',
  };

  return (
    <html lang="en">
      <body className="">
        {/* Site-wide Organization schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        {children}
      </body>
    </html>
  );
}
