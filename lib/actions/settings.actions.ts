'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import {
  SITE_FONT_KEY,
  SITE_LOCALE_KEY,
  SITE_THEME_KEY,
  type SiteFont,
  type SiteLocale,
  type SiteTheme,
} from '../site-settings';
import {
  AI_BASE_URL_KEY,
  AI_ENABLED_KEY,
  AI_MODEL_KEY,
} from '../ai/settings';

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

// Change the default color theme for new visitors (admin only)
export async function updateSiteTheme(theme: SiteTheme) {
  try {
    await requireAdmin();

    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
      throw new Error(await withActionMessage('invalidValue'));
    }

    await prisma.setting.upsert({
      where: { key: SITE_THEME_KEY },
      create: { key: SITE_THEME_KEY, value: theme },
      update: { key: SITE_THEME_KEY, value: theme },
    });

    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('themeUpdated') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : await withActionMessage('invalidValue'),
    };
  }
}

// ---------------------------------------------------------------------------
// AI assistant configuration (model served by the AI gateway, e.g. 9Router)
// ---------------------------------------------------------------------------

const AI_MODEL_RE = /^[\w.:/-]{1,80}$/;
const AI_BASE_URL_RE = /^https?:\/\/[\w.:-]+(\/[\w./-]*)?$/;

async function writeAiSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { key, value },
  });
}

/** Switch both assistants on/off without touching env or redeploying. */
export async function updateAiEnabled(enabled: boolean) {
  try {
    await requireAdmin();

    await writeAiSetting(AI_ENABLED_KEY, enabled ? 'on' : 'off');

    revalidatePath('/admin');
    return { success: true, message: await withActionMessage('aiSaved') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : await withActionMessage('invalidValue'),
    };
  }
}

/** Change the chat model id served by the gateway (e.g. a free-tier model). */
export async function updateAiModel(model: string) {
  try {
    await requireAdmin();

    const clean = model.trim();
    if (!AI_MODEL_RE.test(clean)) {
      throw new Error(await withActionMessage('aiInvalidModel'));
    }

    await writeAiSetting(AI_MODEL_KEY, clean);

    revalidatePath('/admin');
    return { success: true, message: await withActionMessage('aiSaved') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : await withActionMessage('invalidValue'),
    };
  }
}

/** Change the gateway base URL (9Router local/VPS or a hosted provider). */
export async function updateAiBaseUrl(url: string) {
  try {
    await requireAdmin();

    const clean = url.trim().replace(/\/$/, '');
    if (!AI_BASE_URL_RE.test(clean)) {
      throw new Error(await withActionMessage('aiInvalidUrl'));
    }

    await writeAiSetting(AI_BASE_URL_KEY, clean);

    revalidatePath('/admin');
    return { success: true, message: await withActionMessage('aiSaved') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : await withActionMessage('invalidValue'),
    };
  }
}
