
// Absolute site URL used for metadata, sitemap and structured data
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}

// Canonical for any internal path (single-URL site; locale lives server-side)
export function buildAlternates(path: string) {
  const base = getSiteUrl();
  const clean = path === '/' ? '/' : `/${path.replace(/^\//, '')}`;
  return {
    canonical: `${base}${clean}`,
  };
}

// Organization JSON-LD for the Persian market
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'پناه کالا',
    alternateName: 'Panah Kala',
    url: getSiteUrl(),
    logo: `${getSiteUrl()}/images/logo.svg`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      areaServed: 'IR',
      availableLanguage: ['Persian', 'English'],
    },
  };
}

// WebSite JSON-LD with a search action
export function websiteJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: locale === 'fa' ? 'فروشگاه پناه کالا' : 'Panah Kala Shop',
    url: getSiteUrl(),
    inLanguage: locale === 'fa' ? 'fa-IR' : 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${getSiteUrl()}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// Product JSON-LD (price is stored in Toman; schema.org requires IRR for Iran)
export function productJsonLd(product: {
  id: string;
  name: string;
  nameFa: string;
  description: string;
  descriptionFa: string;
  images: string[];
  brand: string;
  slug: string;
  price: string | number;
  compareAtPrice?: string | number | null;
  rating: string | number;
  numReviews: number;
  stock: number;
}, locale: string) {
  const base = getSiteUrl();
  const priceInIRR = Math.round(Number(product.price) * 10);
  const cmp = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  // Only advertise a priceSpecification when a genuine discount exists
  const hasDiscount = cmp !== null && Number.isFinite(cmp) && cmp > Number(product.price);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: locale === 'fa' ? product.nameFa : product.name,
    description: locale === 'fa' ? product.descriptionFa : product.description,
    image: product.images.map((img) =>
      img.startsWith('http') ? img : `${base}${img}`
    ),
    sku: product.id,
    brand: { '@type': 'Brand', name: product.brand },
    ...(product.numReviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating),
            reviewCount: product.numReviews,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price: priceInIRR,
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${base}/product/${product.slug}`,
      seller: { '@type': 'Organization', name: 'پناه کالا' },
      ...(hasDiscount
        ? {
            priceSpecification: {
              '@type': 'PriceSpecification',
              priceCurrency: 'IRR',
              price: priceInIRR,
              // Original (undiscounted) price so Google can show the cut
              referencePrice: Math.round(cmp * 10),
            },
          }
        : {}),
    },
    inLanguage: locale === 'fa' ? 'fa-IR' : 'en-US',
  };
}

// BreadcrumbList JSON-LD
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

