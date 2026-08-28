import type { MetadataRoute } from 'next';

import { getSiteUrl, ALL_LOCALES } from '@/lib/seo';
import { prisma } from '@/db/prisma';

// Full sitemap: static pages + all product pages, for every locale.
// Next.js emits hreflang alternates when `alternates.languages` is provided.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = ALL_LOCALES.flatMap((locale) => [
    { url: `${base}/${locale}`, changeFrequency: 'daily' as const, priority: 1 },
    { url: `${base}/${locale}/search`, changeFrequency: 'daily' as const, priority: 0.8 },
  ]);

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      select: { slug: true, createdAt: true },
    });

    productEntries = products.flatMap((p) =>
      ALL_LOCALES.map((locale) => ({
        url: `${base}/${locale}/product/${p.slug}`,
        lastModified: p.createdAt,
        changeFrequency: 'weekly' as const,
        priority: 0.9,
        alternates: {
          languages: {
            'fa-IR': `${base}/fa/product/${p.slug}`,
            'en-US': `${base}/en/product/${p.slug}`,
          },
        },
      }))
    );
  } catch {
    // DB unavailable (e.g. build without a database) — emit static entries only
  }

  return [...staticEntries, ...productEntries];
}
