// app/components/RateSchema.tsx
'use client';

import React from 'react';

export default function RateSchema({
  base,
  quote,
  rate,
  date,
}: {
  base: string;
  quote: string;
  rate: number | string;
  date: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExchangeRateSpecification",
    "currency": quote,
    "currentExchangeRate": {
      "@type": "UnitPriceSpecification",
      "price": Number(rate),
      "priceCurrency": quote,
    },
    "exchangeRateSpread": "0",
    "validFrom": date,
    "description": `Official ${base} to ${quote} exchange rate as of ${date}`,
    "url": `https://fx.savvyrilla.tech/${base.toLowerCase()}-to-${quote.toLowerCase()}`
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
