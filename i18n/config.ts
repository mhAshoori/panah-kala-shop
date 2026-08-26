import type { Locale } from './routing';

export const dir = (locale: Locale) => (locale === 'fa' ? 'rtl' : 'ltr');

export const localeNames: Record<Locale, { native: string; english: string }> = {
  fa: { native: 'فارسی', english: 'Persian' },
  en: { native: 'English', english: 'English' },
};

export const localeHtmlLang: Record<Locale, string> = {
  fa: 'fa-IR',
  en: 'en',
};
