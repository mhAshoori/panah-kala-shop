import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/*/admin', '/*/cart', '/*/order/', '/*/user/', '/*/sign-in', '/*/sign-up', '/*/shipping-address', '/*/payment-method', '/*/place-order'],
      },
      // Google is partially restricted in Iran — also welcome Yandex and Bing
      { userAgent: ['Googlebot', 'YandexBot', 'Bingbot'], allow: '/' },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
