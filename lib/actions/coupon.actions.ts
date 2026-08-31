'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { formatError } from '../utils';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import { normalizeCouponCode } from '../coupon';
import type { ActionState } from '@/types';

export type CouponAdminInput = {
  id?: string;
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  minCartTotal: string;
  expiresAt: string; // yyyy-mm-dd or ''
  usageLimit: string; // '' = unlimited
  isActive: boolean;
};

export async function getCouponsAdmin() {
  await requireAdmin();
  return prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
}

function parseCouponInput(input: CouponAdminInput) {
  const code = normalizeCouponCode(input.code);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    throw new Error('code');
  }

  const value = Number(input.value);
  if (input.type === 'percent') {
    if (!Number.isFinite(value) || value < 1 || value > 99) {
      throw new Error('value');
    }
  } else {
    if (!Number.isFinite(value) || value <= 0) throw new Error('value');
  }

  const minCartTotal = Number(input.minCartTotal) || 0;
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error('expiresAt');
  }
  const usageLimit = input.usageLimit ? Number(input.usageLimit) : null;
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    throw new Error('usageLimit');
  }

  return {
    code,
    type: input.type,
    value: value.toFixed(2),
    minCartTotal: minCartTotal.toFixed(2),
    expiresAt,
    usageLimit,
    isActive: input.isActive,
  };
}

export async function createCoupon(
  input: CouponAdminInput
): Promise<ActionState> {
  try {
    await requireAdmin();
    const data = parseCouponInput(input);

    const dup = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (dup) throw new Error(await withActionMessage('couponDuplicate'));

    await prisma.coupon.create({ data });
    revalidatePath('/admin/coupons');
    return { success: true, message: await withActionMessage('homeSaved') };
  } catch (error) {
    const raw = error instanceof Error ? error.message : '';
    if (raw === 'code') {
      return { success: false, message: await withActionMessage('couponInvalidCode') };
    }
    if (raw === 'value' || raw === 'expiresAt' || raw === 'usageLimit') {
      return { success: false, message: await withActionMessage('couponInvalidValue') };
    }
    return { success: false, message: formatError(error) };
  }
}

export async function updateCoupon(
  input: CouponAdminInput
): Promise<ActionState> {
  try {
    await requireAdmin();
    if (!input.id) throw new Error('id');
    const data = parseCouponInput(input);

    // Code uniqueness excluding this row
    const dup = await prisma.coupon.findFirst({
      where: { code: data.code, NOT: { id: input.id } },
    });
    if (dup) throw new Error(await withActionMessage('couponDuplicate'));

    await prisma.coupon.update({ where: { id: input.id }, data });
    revalidatePath('/admin/coupons');
    return { success: true, message: await withActionMessage('homeSaved') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function deleteCoupon(id: string): Promise<ActionState> {
  try {
    await requireAdmin();
    await prisma.coupon.delete({ where: { id } });
    revalidatePath('/admin/coupons');
    return { success: true, message: await withActionMessage('couponDeleted') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
