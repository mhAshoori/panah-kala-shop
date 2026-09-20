'use server';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { LOW_STOCK_THRESHOLD } from '@/lib/constants';
import type { AdminActivityEvent } from '@/lib/notify';

const MAX_ROWS = 20;

export async function fetchAdminActivitySince(
  sinceIso: string
): Promise<{ success: true; events: AdminActivityEvent[] } | { success: false }> {
  try {
    await requireAdmin();
  } catch {
    return { success: false };
  }

  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) since.setTime(0);
  const now = new Date();

  const [newOrders, paidOrders, newUsers, unreadQuestions, lowStockProducts] =
    await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since, lt: now } },
        select: { id: true, createdAt: true, isPaid: true },
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
      }),
      prisma.order.findMany({
        where: { isPaid: true, paidAt: { gte: since, lt: now } },
        select: { id: true, paidAt: true, createdAt: true },
        orderBy: { paidAt: 'desc' },
        take: MAX_ROWS,
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: since, lt: now }, role: { not: 'admin' } },
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
      }),
      prisma.supportMessage.findMany({
        where: { fromAdmin: false, isRead: false, createdAt: { gte: since, lt: now } },
        select: { id: true, userId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: MAX_ROWS,
      }),
      prisma.product.findMany({
        where: { stock: { lte: LOW_STOCK_THRESHOLD, gt: 0 } },
        select: { id: true, name: true },
        take: MAX_ROWS,
      }),
    ]);

  const events: AdminActivityEvent[] = [
    ...newOrders.map((o) => ({
      id: `order:${o.id}`,
      kind: 'order' as const,
      href: '/admin/orders',
      createdAtIso: o.createdAt.toISOString(),
    })),
    ...paidOrders.map((o) => ({
      id: `payment:${o.id}`,
      kind: 'payment' as const,
      href: '/admin/orders',
      createdAtIso: (o.paidAt ?? now).toISOString(),
    })),
    ...newUsers.map((u) => ({
      id: `signup:${u.id}`,
      kind: 'signup' as const,
      href: '/admin/users',
      createdAtIso: u.createdAt.toISOString(),
    })),
    ...unreadQuestions.map((m) => ({
      id: `question:${m.id}`,
      kind: 'question' as const,
      href: '/admin/support',
      createdAtIso: m.createdAt.toISOString(),
    })),
    ...lowStockProducts.map((p) => ({
      id: `lowStock:${p.id}`,
      kind: 'lowStock' as const,
      href: '/admin/products',
      createdAtIso: now.toISOString(),
      refId: p.name,
    })),
  ];

  return { success: true, events };
}
