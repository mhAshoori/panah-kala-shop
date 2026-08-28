import type { MetadataRoute } from 'next';

// PWA basics: name, RTL start URL and theme colors
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'فروشگاه پناه کالا',
    short_name: 'پناه کالا',
    description: 'فروشگاه اینترنتی پناه کالا — خرید آنلاین با بهترین قیمت و کیفیت',
    lang: 'fa',
    dir: 'rtl',
    start_url: '/fa',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a9396',
  };
}
