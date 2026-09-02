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
    const segments = parseAssistantContent('[الف](/a) و [ب](/b)');
    expect(segments.filter((s) => s.type === 'link')).toHaveLength(2);
  });
});
