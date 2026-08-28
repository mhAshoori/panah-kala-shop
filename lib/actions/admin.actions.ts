'use server';

import { prisma } from '@/db/prisma';
import { convertToPlainObject } from '../utils';
import { PAGE_SIZE } from '../constants';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import { Order } from '@/types';

// Get dashboard summary: counts, total sales, monthly sales and latest sales
export async function getOrderSummary() {
  await requireAdmin();

  const [ordersCount, productsCount, usersCount, totalSalesAgg] =
    await Promise.all([
      prisma.order.count(),
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.aggregate({ _sum: { totalPrice: true } }),
    ]);

  // Monthly sales for the last 6 months (bucketed in JS for portability)
  const start = new Date();
  start.setMonth(start.getMonth() - 5);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const recentOrders = await prisma.order.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, totalPrice: true },
  });

  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const monthlyMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  for (const o of recentOrders) {
    const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(o.totalPrice));
    }
  }

  const monthlySales = monthKeys.map((k) => ({
    month: k,
    totalSales: monthlyMap.get(k) ?? 0,
  }));

  const latestSales = await prisma.order.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });

  return {
    ordersCount,
    productsCount,
    usersCount,
    totalSales: Number(totalSalesAgg._sum.totalPrice ?? 0),
    monthlySales,
    latestSales: convertToPlainObject(latestSales) as unknown as Order[],
  };
}

// Get all orders for the admin table, optionally filtered by user name/email, with pagination
export async function getAllOrders({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query?: string;
}) {
  await requireAdmin();

  const queryFilter =
    query && query.trim() !== ''
      ? {
          user: {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { email: { contains: query, mode: 'insensitive' as const } },
            ],
          },
        }
      : {};

  const data = await prisma.order.findMany({
    where: queryFilter,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    include: { user: { select: { name: true, email: true } } },
  });

  const dataCount = await prisma.order.count({ where: queryFilter });

  return {
    data: convertToPlainObject(data) as unknown as Order[],
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Mark an order as paid manually (e.g. COD cash collected)
export async function updateOrderToPaid(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findFirst({ where: { id: orderId } });
  if (!order) throw new Error(await withActionMessage('orderNotFound'));
  if (order.isPaid)
    throw new Error(await withActionMessage('orderAlreadyPaid'));

  // Return a plain success flag — Prisma Decimals are not serializable
  // across the Server Action boundary.
  await prisma.order.update({
    where: { id: orderId },
    data: { isPaid: true, paidAt: new Date() },
  });
  return { success: true as const };
}

// Mark a paid order as delivered (step 2 — requires payment first)
export async function updateOrderToDelivered(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findFirst({ where: { id: orderId } });
  if (!order) throw new Error(await withActionMessage('orderNotFound'));
  if (order.isDelivered)
    throw new Error(await withActionMessage('orderAlreadyDelivered'));
  if (!order.isPaid) {
    throw new Error(await withActionMessage('orderMustBePaid'));
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { isDelivered: true, deliveredAt: new Date() },
  });
  return { success: true as const };
}

// Delete an order by ID (order items cascade)
export async function deleteOrder(orderId: string) {
  await requireAdmin();

  const order = await prisma.order.findFirst({ where: { id: orderId } });
  if (!order) throw new Error(await withActionMessage('orderNotFound'));

  await prisma.order.delete({ where: { id: orderId } });

  return { success: true };
}
