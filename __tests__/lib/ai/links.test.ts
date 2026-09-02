import {
  isSafeInternalHref,
  parseAssistantContent,
} from '@/lib/ai/links';

describe('isSafeInternalHref', () => {
  it('accepts relative paths', () => {
    expect(isSafeInternalHref('/product/galaxy-a55')).toBe(true);
    expect(isSafeInternalHref('/search?q=گوشی')).toBe(true);
    expect(isSafeInternalHref('/user/profile')).toBe(true);
  });

  it('rejects protocol-relative and tricky paths', () => {
    expect(isSafeInternalHref('//evil.com')).toBe(false);
    expect(isSafeInternalHref('javascript:alert(1)')).toBe(false);
    expect(isSafeInternalHref('')).toBe(false);
  });

  it('accepts same-origin absolute URLs only', () => {
    const origin = 'https://shop.example.com';
    expect(isSafeInternalHref('https://shop.example.com/cart', origin)).toBe(true);
    expect(isSafeInternalHref('http://shop.example.com/cart', origin)).toBe(false);
    expect(isSafeInternalHref('https://evil.com/cart', origin)).toBe(false);
    // No origin context → absolute URLs can never be verified
    expect(isSafeInternalHref('https://shop.example.com/cart')).toBe(false);
  });
});

describe('parseAssistantContent', () => {
  it('splits text and internal links', () => {
    const segments = parseAssistantContent(
      'این [گوشی سامسونگ](/product/galaxy-a55) رو پیشنهاد می‌کنم.'
    );
    expect(segments).toEqual([
      { type: 'text', value: 'این ' },
      { type: 'link', label: 'گوشی سامسونگ', href: '/product/galaxy-a55' },
      { type: 'text', value: ' رو پیشنهاد می‌کنم.' },
    ]);
  });

  it('downgrades external links to plain text without the URL', () => {
    const segments = parseAssistantContent(
      'بیشتر بدانید: [تخفیف‌ها](https://evil.com) تمام شد'
    );
    expect(segments).toEqual([
      { type: 'text', value: 'بیشتر بدانید: ' },
      { type: 'text', value: 'تخفیف‌ها' },
      { type: 'text', value: ' تمام شد' },
    ]);
    expect(JSON.stringify(segments)).not.toContain('evil.com');
  });

  it('handles same-origin absolute links when origin matches', () => {
    const origin = 'https://shop.example.com';
    const segments = parseAssistantContent(
      '[سبد خرید](https://shop.example.com/cart)',
      origin
    );
    expect(segments).toEqual([
      { type: 'link', label: 'سبد خرید', href: 'https://shop.example.com/cart' },
    ]);
  });

  it('returns one text segment when no links exist', () => {
    expect(parseAssistantContent('سلام دنیا')).toEqual([
      { type: 'text', value: 'سلام دنیا' },
    ]);
  });

  it('parses multiple links', () => {
    const segments = parseAssistantContent('[الف](/cart) و [ب](/user/orders)');
    expect(segments.filter((s) => s.type === 'link')).toHaveLength(2);
  });
});

// Route-validity layer: hallucinated paths must never render as links
describe('route validity (no dead links)', () => {
  it('accepts real static routes', () => {
    expect(isSafeInternalHref('/cart')).toBe(true);
    expect(isSafeInternalHref('/user/orders')).toBe(true);
    expect(isSafeInternalHref('/admin/products')).toBe(true);
    expect(isSafeInternalHref('/contact-us')).toBe(true);
    expect(isSafeInternalHref('/admin/marketing')).toBe(true);
  });

  it('accepts real dynamic routes with plausible shapes', () => {
    expect(isSafeInternalHref('/product/iphone-15-pro')).toBe(true);
    expect(isSafeInternalHref('/category/mobile-phones')).toBe(true);
    expect(
      isSafeInternalHref('/admin/orders/24c2d978-f9f3-4afc-add8-e1aab5ab00a2')
    ).toBe(true);
  });

  it('downgrades hallucinated/unknown paths to plain text', () => {
    expect(isSafeInternalHref('/prodct/iphone')).toBe(false);
    expect(isSafeInternalHref('/product/')).toBe(false);
    expect(isSafeInternalHref('/does-not-exist')).toBe(false);
    expect(isSafeInternalHref('/admin/unknown-panel')).toBe(false);
    expect(isSafeInternalHref('/user/unknown')).toBe(false);
  });

  it('allows query strings only on /search', () => {
    expect(isSafeInternalHref('/search?q=گوشی&sort=cheapest')).toBe(true);
    expect(isSafeInternalHref('/cart?utm=x')).toBe(false);
    expect(isSafeInternalHref('/product/x?evil=1')).toBe(false);
  });

  it('query-string routes degrade to text in parseAssistantContent', () => {
    const segments = parseAssistantContent('ببین [این](/does-not-exist)');
    expect(segments).toEqual([
      { type: 'text', value: 'ببین ' },
      { type: 'text', value: 'این' },
    ]);
  });
});
