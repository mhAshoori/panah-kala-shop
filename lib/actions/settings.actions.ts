'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import {
  SITE_FONT_KEY,
  SITE_LOCALE_KEY,
  type SiteFont,
  type SiteLocale,
} from '../site-settings';

// Change the site-wide display language (admin only)
export async function updateSiteLocale(locale: SiteLocale) {
  try {
    await requireAdmin();

    if (locale !== 'fa' && locale !== 'en') {
      throw new Error('Invalid locale');
    }

    await prisma.setting.upsert({
      where: { key: SITE_LOCALE_KEY },
      create: { key: SITE_LOCALE_KEY, value: locale },
      update: { key: SITE_LOCALE_KEY, value: locale },
    });

    // Re-render the whole app in the new language
    revalidatePath('/', 'layout');

    return { success: true, message: 'Language updated' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update language',
    };
  }
}

// Change the site-wide typeface (admin only)
export async function updateSiteFont(font: SiteFont) {
  try {
    await requireAdmin();

    if (font !== 'shabnam' && font !== 'vazirmatn') {
      throw new Error('Invalid font');
    }

    await prisma.setting.upsert({
      where: { key: SITE_FONT_KEY },
      create: { key: SITE_FONT_KEY, value: font },
      update: { key: SITE_FONT_KEY, value: font },
    });

    revalidatePath('/', 'layout');

    return { success: true, message: 'Font updated' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update font',
    };
  }
}
