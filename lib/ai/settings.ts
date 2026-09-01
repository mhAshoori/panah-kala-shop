// Admin-manageable AI configuration, persisted in the Setting table.
// Env vars (AI_MODEL / AI_BASE_URL) are the fallback defaults; the admin
// panel overrides them at runtime without a redeploy. The API key itself
// stays in env only — never stored in or read from the DB.

import { cache } from 'react';

import { prisma } from '@/db/prisma';

export const AI_MODEL_KEY = 'aiModel';
export const AI_BASE_URL_KEY = 'aiBaseUrl';
export const AI_ENABLED_KEY = 'aiEnabled';

async function readSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  } catch {
    // DB unavailable (e.g. during build) — fall back to env/defaults
    return null;
  }
}

/** The chat model id served by the AI gateway (9Router or other). */
export const getAiModel = cache(async (): Promise<string> => {
  return (await readSetting(AI_MODEL_KEY)) || process.env.AI_MODEL || 'default';
});

/** OpenAI-compatible base URL of the gateway. */
export const getAiBaseUrl = cache(async (): Promise<string> => {
  return (
    (await readSetting(AI_BASE_URL_KEY)) ||
    process.env.AI_BASE_URL ||
    'http://localhost:9router/v1'
  );
});

/**
 * Master switch for both assistants. Defaults to on when an API key exists,
 * so a fresh deployment with only env vars works out of the box.
 */
export const getAiEnabled = cache(async (): Promise<boolean> => {
  const value = await readSetting(AI_ENABLED_KEY);
  if (value === 'off') return false;
  if (value === 'on') return true;
  return !!process.env.AI_API_KEY; // unset → env decides
});
