import {
  sanitizeAssistantChunk,
  sanitizeAssistantText,
  friendlyAssistantError,
} from '@/lib/ai/sanitize';

describe('sanitizeAssistantChunk (streaming, stateful)', () => {
  it('strips brace content across chunk boundaries', () => {
    const state = { inBraces: false, inParens: false };
    const a = sanitizeAssistantChunk('قیمت ۶۸ {"x":1', state);
    const b = sanitizeAssistantChunk(',y:2} تومان است', state);
    expect(a + b).toBe('قیمت ۶۸  تومان است');
  });

  it('strips parentheticals and trims trailing space before them', () => {
    const state = { inBraces: false, inParens: false };
    const out = sanitizeAssistantChunk('موجود است (stock: 5) در انبار', state);
    expect(out).toBe('موجود است در انبار');
  });

  it('keeps plain text untouched', () => {
    const state = { inBraces: false, inParens: false };
    expect(sanitizeAssistantChunk('سلام! چطور کمکتون کنم؟', state)).toBe(
      'سلام! چطور کمکتون کنم؟'
    );
  });

  it('preserves markdown link URLs split across chunk boundaries', () => {
    const state = { inBraces: false, inParens: false };
    const a = sanitizeAssistantChunk('این گوشی را ببینید: [گوشی سامسونگ](/product', state);
    const b = sanitizeAssistantChunk('/galaxy-a55) برای خرید', state);
    expect(a + b).toBe(
      'این گوشی را ببینید: [گوشی سامسونگ](/product/galaxy-a55) برای خرید'
    );
  });

  it('preserves a full markdown link in one chunk', () => {
    const state = { inBraces: false, inParens: false };
    expect(
      sanitizeAssistantChunk('لینک: [سبد خرید](/cart) آماده است', state)
    ).toBe('لینک: [سبد خرید](/cart) آماده است');
  });

  it('still strips non-link parentheticals after a link', () => {
    const state = { inBraces: false, inParens: false };
    const out = sanitizeAssistantChunk(
      '[محصول](/product/x) موجود است (stock: 5)',
      state
    );
    expect(out).toBe('[محصول](/product/x) موجود است');
  });
});

describe('sanitizeAssistantText (final pass)', () => {
  it('removes TOOL_CALL/TOOL_RESULT protocol blocks', () => {
    expect(
      sanitizeAssistantText('TOOL_CALL: {"tool":"x"} جواب نهایی')
    ).toBe('جواب نهایی');
    expect(sanitizeAssistantText('TOOL_RESULT: {...} پاسخ')).toBe('پاسخ');
  });

  it('removes leftover JSON objects', () => {
    expect(sanitizeAssistantText('قیمت {"price": 100} تومان')).toBe(
      'قیمت تومان'
    );
  });

  it('removes diagnostic parentheticals with codes', () => {
    expect(sanitizeAssistantText('خطا رخ داد (HTTP 502)')).toBe('خطا رخ داد');
    expect(sanitizeAssistantText('خطا رخ داد (کد 503)')).toBe('خطا رخ داد');
    expect(sanitizeAssistantText('خطا (error: quota)')).toBe('خطا');
  });

  it('keeps markdown link URLs intact', () => {
    expect(
      sanitizeAssistantText('پیشنهاد: [گوشی سامسونگ](/product/galaxy-a55) خوبه')
    ).toBe('پیشنهاد: [گوشی سامسونگ](/product/galaxy-a55) خوبه');
    expect(
      sanitizeAssistantText('[سفارش abc12345](/admin/orders/abc123) را ببینید (HTTP 500)')
    ).toBe('[سفارش abc12345](/admin/orders/abc123) را ببینید');
  });

  it('empties a pure tool-call message', () => {
    expect(sanitizeAssistantText('TOOL_CALL: {"tool":"search"}')).toBe('');
  });

  it('normalizes whitespace', () => {
    expect(sanitizeAssistantText('سلام   دنیا')).toBe('سلام دنیا');
  });
});

describe('friendlyAssistantError', () => {
  it('maps statuses to short Persian messages without codes', () => {
    expect(friendlyAssistantError(429)).toContain('زیادی');
    expect(friendlyAssistantError(503)).toContain('در دسترس نیست');
    expect(friendlyAssistantError(500)).toContain('موقتاً');
    // Never leak raw statuses or braces
    for (const s of [429, 500, 502, 503]) {
      expect(friendlyAssistantError(s)).not.toMatch(/[{}()]|\d{3}/);
    }
  });
});
