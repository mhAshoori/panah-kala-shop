import { defineRouting } from 'next-intl/routing';

// Single-URL architecture: the locale is never shown in the URL and is
// resolved server-side from the DB (see lib/site-settings.ts).
export const routing = defineRouting({
  locales: ['fa', 'en'],
  defaultLocale: 'fa',
  localePrefix: 'never',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
