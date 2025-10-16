import type { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://fx.savvyrilla.tech'
  const pages = ['/', '/usd-to-ssp', '/usd-to-sxp']
  return pages.map(url => ({
    url: base + url,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: url === '/' ? 0.7 : 0.9,
  }))
}
