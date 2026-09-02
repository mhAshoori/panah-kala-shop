import { OFFER_FOOTER, renderOfferHtml } from '@/lib/email/marketing';
import { isEmailConfigured, contactEmail } from '@/lib/email/mailer';

describe('marketing email', () => {
  describe('renderOfferHtml', () => {
    const base = {
      subject: 'پیشنهاد ویژه آخر هفته',
      title: 'تخفیف پایان هفته',
      body: 'تا ۲۰٪ تخفیف روی همه محصولات',
    };

    it('renders the title and body', () => {
      const html = renderOfferHtml(base);
      expect(html).toContain('تخفیف پایان هفته');
      expect(html).toContain('تا ۲۰٪ تخفیف روی همه محصولات');
    });

    it('renders RTL Persian markup', () => {
      const html = renderOfferHtml(base);
      expect(html).toContain('dir="rtl"');
      expect(html).toContain('lang="fa"');
    });

    it('includes the coupon code block when provided', () => {
      const html = renderOfferHtml({ ...base, couponCode: 'WEEKEND20' });
      expect(html).toContain('WEEKEND20');
    });

    it('omits the coupon block when absent', () => {
      const html = renderOfferHtml(base);
      expect(html).not.toContain('dashed');
    });

    it('builds the CTA from NEXT_PUBLIC_SITE_URL + ctaPath', () => {
      const prev = process.env.NEXT_PUBLIC_SITE_URL;
      process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example.com';
      const html = renderOfferHtml({ ...base, ctaPath: '/search?sort=cheapest' });
      expect(html).toContain('https://shop.example.com/search?sort=cheapest');
      process.env.NEXT_PUBLIC_SITE_URL = prev;
    });

    it('always includes the unsubscribe footer', () => {
      const html = renderOfferHtml(base);
      expect(html).toContain(OFFER_FOOTER);
    });
  });

  describe('mailer configuration helpers', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = originalEnv;
    });

    it('isEmailConfigured is false without SMTP env', () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      expect(isEmailConfigured()).toBe(false);
    });

    it('isEmailConfigured requires all three vars', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'u';
      process.env.SMTP_PASS = 'p';
      expect(isEmailConfigured()).toBe(true);
      delete process.env.SMTP_PASS;
      expect(isEmailConfigured()).toBe(false);
    });

    it('contactEmail falls back to the support default', () => {
      delete process.env.CONTACT_EMAIL;
      expect(contactEmail()).toBe('support@panahkala.ir');
      process.env.CONTACT_EMAIL = 'care@panahkala.ir';
      expect(contactEmail()).toBe('care@panahkala.ir');
    });
  });
});
