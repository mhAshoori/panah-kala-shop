// Admin-manageable store pricing configuration, persisted in the Setting
// table. Falls back to lib/constants values when unset. Cached per request.

import { cache } from 'react';

import { prisma } from '@/db/prisma';
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  TAX_RATE,
} from './constants';

export const SHIPPING_FEE_KEY = 'shippingFee';
export const FREE_SHIPPING_THRESHOLD_KEY = 'freeShippingThreshold';
export const TAX_RATE_KEY = 'taxRate';

async function readNumber(key: string, fallback: number): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    const n = Number(setting?.value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  } catch {
    // DB unavailable (e.g. during build) — fall back to defaults
    return fallback;
  }
}

/** Flat shipping fee in Toman (applied below the free-shipping threshold). */
export const getShippingFee = cache(async () =>
  readNumber(SHIPPING_FEE_KEY, SHIPPING_FLAT_RATE)
);

/** Cart subtotal at or above which shipping is free (Toman). */
export const getFreeShippingThreshold = cache(async () =>
  readNumber(FREE_SHIPPING_THRESHOLD_KEY, FREE_SHIPPING_THRESHOLD)
);

/** VAT rate applied to the items subtotal (0..1). */
export const getTaxRate = cache(async () => {
  const rate = await readNumber(TAX_RATE_KEY, TAX_RATE);
  return Math.min(rate, 1);
});
