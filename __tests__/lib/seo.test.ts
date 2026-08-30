import {
  buildAlternates,
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from '@/lib/seo';

// The module reads env at call time; default is localhost
describe('lib/seo — structured data (SEO for the Persian market)', () => {
  describe('buildAlternates', () => {
    it('builds canonical URLs for internal paths', () => {
      const result = buildAlternates('/product/iphone-15-pro');
      expect(result.canonical).toBe(
        'http://localhost:3000/product/iphone-15-pro'
      );
    });

    it('keeps the root path as-is', () => {
      expect(buildAlternates('/').canonical).toBe('http://localhost:3000/');
    });

    it('normalizes a missing leading slash', () => {
      expect(buildAlternates('category/phones').canonical).toBe(
        'http://localhost:3000/category/phones'
      );
    });
  });

  describe('organizationJsonLd', () => {
    it('targets the Iranian market with Persian as primary name', () => {
      const jsonLd = organizationJsonLd();
      expect(jsonLd['@type']).toBe('Organization');
      expect(jsonLd.name).toBe('پناه کالا');
      expect(jsonLd.alternateName).toBe('Panah Kala');
      expect(jsonLd.contactPoint.areaServed).toBe('IR');
      expect(jsonLd.contactPoint.availableLanguage).toEqual([
        'Persian',
        'English',
      ]);
    });
  });

  describe('websiteJsonLd', () => {
    it('uses fa-IR language tag and Persian name for fa locale', () => {
      const jsonLd = websiteJsonLd('fa');
      expect(jsonLd.inLanguage).toBe('fa-IR');
      expect(jsonLd.name).toBe('فروشگاه پناه کالا');
    });

    it('uses en-US language tag for en locale', () => {
      const jsonLd = websiteJsonLd('en');
      expect(jsonLd.inLanguage).toBe('en-US');
      expect(jsonLd.name).toBe('Panah Kala Shop');
    });

    it('exposes a SearchAction pointing at the search route', () => {
      const jsonLd = websiteJsonLd('fa');
      expect(jsonLd.potentialAction['@type']).toBe('SearchAction');
      expect(jsonLd.potentialAction.target.urlTemplate).toBe(
        'http://localhost:3000/search?q={search_term_string}'
      );
      expect(jsonLd.potentialAction['query-input']).toBe(
        'required name=search_term_string'
      );
    });
  });

  describe('productJsonLd', () => {
    const product = {
      id: 'p-uuid-1',
      name: 'iPhone 15 Pro',
      nameFa: 'آیفون ۱۵ پرو',
      description: 'Great phone',
      descriptionFa: 'گوشی عالی',
      images: ['/images/sample-products/p1.webp'],
      brand: 'Apple',
      slug: 'iphone-15-pro',
      price: '68500000.00',
      rating: '4.8',
      numReviews: 132,
      stock: 12,
    };

    it('converts Toman to IRR (×10) — required by schema.org for Iran', () => {
      const jsonLd = productJsonLd(product, 'fa');
      expect(jsonLd.offers.priceCurrency).toBe('IRR');
      expect(jsonLd.offers.price).toBe(685000000);
    });

    it('rounds non-integer Toman prices correctly in IRR', () => {
      const jsonLd = productJsonLd(
        { ...product, price: '1234567.89' },
        'fa'
      );
      expect(jsonLd.offers.price).toBe(12345679);
    });

    it('localizes name and description per locale', () => {
      expect(productJsonLd(product, 'fa').name).toBe('آیفون ۱۵ پرو');
      expect(productJsonLd(product, 'en').name).toBe('iPhone 15 Pro');
      expect(productJsonLd(product, 'fa').inLanguage).toBe('fa-IR');
      expect(productJsonLd(product, 'en').inLanguage).toBe('en-US');
    });

    it('includes aggregateRating only when reviews exist', () => {
      expect(productJsonLd(product, 'fa').aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.8,
        reviewCount: 132,
      });
      const noReviews = productJsonLd({ ...product, numReviews: 0 }, 'fa');
      expect(noReviews.aggregateRating).toBeUndefined();
    });

    it('marks availability per stock', () => {
      expect(productJsonLd(product, 'fa').offers.availability).toBe(
        'https://schema.org/InStock'
      );
      expect(
        productJsonLd({ ...product, stock: 0 }, 'fa').offers.availability
      ).toBe('https://schema.org/OutOfStock');
    });

    it('absolutizes relative image URLs', () => {
      const jsonLd = productJsonLd(product, 'fa');
      expect(jsonLd.image).toEqual([
        'http://localhost:3000/images/sample-products/p1.webp',
      ]);
      const absolute = productJsonLd(
        { ...product, images: ['https://cdn.example.com/x.webp'] },
        'fa'
      );
      expect(absolute.image).toEqual(['https://cdn.example.com/x.webp']);
    });
  });

  describe('breadcrumbJsonLd', () => {
    it('positions list items starting at 1', () => {
      const jsonLd = breadcrumbJsonLd([
        { name: 'خانه', url: 'http://localhost:3000/' },
        { name: 'گوشی موبایل', url: 'http://localhost:3000/category/phones' },
        { name: 'آیفون', url: 'http://localhost:3000/product/iphone' },
      ]);
      expect(jsonLd.itemListElement).toHaveLength(3);
      expect(jsonLd.itemListElement[0].position).toBe(1);
      expect(jsonLd.itemListElement[2].position).toBe(3);
      expect(jsonLd.itemListElement[1].name).toBe('گوشی موبایل');
    });
  });
});
