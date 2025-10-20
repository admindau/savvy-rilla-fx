import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fx.savvyrilla.tech';
  const pages = ['/', '/usd-to-ssp', '/usd-to-sxp'];
  const now = new Date();
  return pages.map((url) => ({
    url: base + url,
    lastModified: now,
    changeFrequency: 'daily',
    priority: url === '/' ? 0.7 : 0.9,
  }));
}
