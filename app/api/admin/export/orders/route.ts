import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { toCsv } from '@/lib/csv';

// GET /api/admin/export/orders?limit=N — admin-only CSV of recent orders.
// Default last 1000, max 5000.

const HEADERS = [
  'id',
  'createdAt',
  'user',
  'email',
  'paymentMethod',
  'isPaid',
  'paidAt',
  'isDelivered',
  'deliveredAt',
  'itemsTotal',
  'shippingPrice',
  'taxPrice',
  'discount',
  'totalPrice',
  'couponCode',
  'shippingAddress',
  'items',
];

const esc = (v: unknown) => {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '1000');
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 5000)
    : 1000;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { name: true, email: true } },
      orderItems: { select: { name: true, qty: true, price: true, variantLabel: true } },
    },
  });

  const rows = orders.map((o) => [
    o.id,
    o.createdAt,
    o.user?.name ?? '',
    o.user?.email ?? '',
    o.paymentMethod,
    o.isPaid ? 'yes' : 'no',
    o.paidAt,
    o.isDelivered ? 'yes' : 'no',
    o.deliveredAt,
    o.itemsPrice,
    o.shippingPrice,
    o.taxPrice,
    o.couponDiscount,
    o.totalPrice,
    o.couponCode ?? '',
    o.shippingAddress
      ? `${esc((o.shippingAddress as { fullName?: string }).fullName ?? '')} — ${esc(
          (o.shippingAddress as { streetAddress?: string }).streetAddress ?? ''
        )}, ${esc((o.shippingAddress as { city?: string }).city ?? '')}`
      : '',
    o.orderItems
      .map((i) => `${i.name} ×${i.qty} (${i.price})${i.variantLabel ? ` [${i.variantLabel}]` : ''}`)
      .join(' | '),
  ]);

  const csv = toCsv(HEADERS, rows.map((r) => r.map(esc)));

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
