import { getRequestConfig } from 'next-intl/server';

import { getSiteLocale } from '@/lib/site-settings';

// The site language comes from the DB (admin-controlled, Persian default).
// There are no locale URL prefixes — the whole app lives at the root.
export default getRequestConfig(async () => {
  const locale = await getSiteLocale();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
