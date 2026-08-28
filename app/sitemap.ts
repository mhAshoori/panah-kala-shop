import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/seo';
import { prisma } from '@/db/prisma';

// Full sitemap: static pages + all product pages (single-URL site).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/search`, changeFrequency: 'daily', priority: 0.8 },
  ];

  let categoryEntries: MetadataRoute.Sitemap = [];
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true },
    });

    categoryEntries = categories.map((c) => ({
      url: `${base}/category/${c.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    }));

    const products = await prisma.product.findMany({
      select: { slug: true, createdAt: true },
    });

    productEntries = products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }));
  } catch {
    // DB unavailable (e.g. build without a database) — emit static entries only
  }

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
