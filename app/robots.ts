import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/seo';
import { getSiteMeta } from '@/lib/home-content';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = getSiteUrl();
  const meta = await getSiteMeta();

  // Emergency maintenance switch (admin panel): tell every crawler to go away
  if (meta.noindex === true) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      sitemap: `${siteUrl}/sitemap.xml`,
      host: siteUrl,
    };
  }

  // Admin can add extra Disallow paths (one per line) from the SEO block
  const extraDisallow = (meta.robotsExtraDisallow ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/admin',
          '/*/cart',
          '/*/order/',
          '/*/user/',
          '/*/sign-in',
          '/*/sign-up',
          '/*/shipping-address',
          '/*/payment-method',
          '/*/place-order',
          ...extraDisallow,
        ],
      },
      // Google is partially restricted in Iran — also welcome Yandex and Bing
      { userAgent: ['Googlebot', 'YandexBot', 'Bingbot'], allow: '/' },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
