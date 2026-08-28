import { cache } from 'react';

import { prisma } from '@/db/prisma';

export type SiteLocale = 'fa' | 'en';
export type SiteFont = 'shabnam' | 'vazirmatn';

export const SITE_LOCALE_KEY = 'siteLocale';
export const SITE_FONT_KEY = 'siteFont';

async function readSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  } catch {
    // DB unavailable (e.g. during build) — fall back to defaults
    return null;
  }
}

/**
 * The site-wide display language. Persian is the default; only admins can
 * change it (see lib/actions/settings.actions.ts). Cached per request.
 */
export const getSiteLocale = cache(async (): Promise<SiteLocale> => {
  const value = await readSetting(SITE_LOCALE_KEY);
  return value === 'en' ? 'en' : 'fa';
});

/** The site-wide Persian typeface (Shabnam default). Admin-switchable. */
export const getSiteFont = cache(async (): Promise<SiteFont> => {
  const value = await readSetting(SITE_FONT_KEY);
  return value === 'vazirmatn' ? 'vazirmatn' : 'shabnam';
});
