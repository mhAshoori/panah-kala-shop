'use server';

import { getLocale } from 'next-intl/server';

import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { getOrderById } from './order.actions';
import { APP_BASE_URL } from '../pay/config';
import {
  zarinpalRequestPayment,
  zarinpalVerifyPayment,
} from '../pay/zarinpal';

/**
 * Start a ZarinPal payment for a pending order (paymentMethod === 'zarinpal').
 * Returns the StartPay URL to redirect the user to, tied to the new authority.
 */
export async function createZarinpalPayment(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: 'Not authenticated' };
    }

    const order = await getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };
    if (order.user.email !== session.user.email && order.userId !== session.user.id) {
      return { success: false, message: 'Forbidden' };
    }
    if (order.isPaid) {
      return { success: false, message: 'Order is already paid' };
    }
    if (order.paymentMethod !== 'zarinpal') {
      return { success: false, message: 'Not a ZarinPal order' };
    }

    const locale = ((await getLocale()) as 'fa' | 'en') ?? 'fa';

    // Build the callback URL ZarinPal will redirect the user back to.
    const callback_url = `${APP_BASE_URL}/api/zarinpal/callback?locale=${locale}&orderId=${order.id}`;

    const description = `سفارش ${order.id} / Panah Kala Shop`;

    const result = await zarinpalRequestPayment({
      amount: Number(order.totalPrice),
      description,
      callback_url,
      mobile: (order.shippingAddress as { phone?: string })?.phone,
      email: order.user.email,
    });

    if (!result.success) {
      return {
        success: false,
        message: `ZarinPal request failed (${result.code}): ${result.message}`,
      };
    }

    // Persist the authority so we can verify on callback
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentAuthority: result.authority },
    });

    return { success: true, startUrl: result.startUrl };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}

/**
 * Verify a payment when ZarinPal redirects back to /api/zarinpal/callback.
 * Makes the verify call, records the result, and returns a redirect location.
 */
export async function verifyZarinpalPayment(params: {
  orderId: string;
  authority: string;
  status: string;
  locale: string;
}) {
  const { orderId, authority, status, locale } = params;
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return { redirectTo: `/${locale}/order/${orderId}`, success: false as const };
    }

    const base = {
      redirectTo: `/${locale}/order/${orderId}`,
    };

    // User cancelled / payment not completed on the gateway
    if (status === 'NOK') {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentResult: { status: 'NOK' } },
      });
      return { ...base, success: false as const };
    }

    const verification = await zarinpalVerifyPayment({
      amount: Number(order.totalPrice),
      authority,
    });

    if (verification.success) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          isPaid: true,
          paidAt: new Date(),
          paymentResult: {
            status: 'OK',
            authority,
            refId: verification.refId,
            code: verification.code,
          },
        },
      });
      return { ...base, success: true as const, refId: verification.refId };
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentResult: {
          status: 'FAILED',
          authority,
          code: verification.code,
        },
      },
    });
    return { ...base, success: false as const };
  } catch {
    return {
      redirectTo: `/${locale}/order/${orderId}`,
      success: false as const,
    };
  }
}