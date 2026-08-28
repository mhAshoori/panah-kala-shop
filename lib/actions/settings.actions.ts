'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
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
      throw new Error(await withActionMessage('invalidValue'));
    }

    await prisma.setting.upsert({
      where: { key: SITE_LOCALE_KEY },
      create: { key: SITE_LOCALE_KEY, value: locale },
      update: { key: SITE_LOCALE_KEY, value: locale },
    });

    // Re-render the whole app in the new language
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('languageUpdated') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : await withActionMessage('invalidValue'),
    };
  }
}

// Change the site-wide typeface (admin only)
export async function updateSiteFont(font: SiteFont) {
  try {
    await requireAdmin();

    if (font !== 'shabnam' && font !== 'vazirmatn') {
      throw new Error(await withActionMessage('invalidValue'));
    }

    await prisma.setting.upsert({
      where: { key: SITE_FONT_KEY },
      create: { key: SITE_FONT_KEY, value: font },
      update: { key: SITE_FONT_KEY, value: font },
    });

    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('fontUpdated') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : await withActionMessage('invalidValue'),
    };
  }
}
