import { cache } from 'react';

import { prisma } from '@/db/prisma';

export type SiteLocale = 'fa' | 'en';

export const SITE_LOCALE_KEY = 'siteLocale';

/**
 * The site-wide display language. Persian is the default; only admins can
 * change it (see lib/actions/settings.actions.ts). Cached per request.
 */
export const getSiteLocale = cache(async (): Promise<SiteLocale> => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SITE_LOCALE_KEY },
    });
    if (setting?.value === 'en' || setting?.value === 'fa') {
      return setting.value;
    }
  } catch {
    // DB unavailable (e.g. during build) — fall back to Persian
  }
  return 'fa';
});
