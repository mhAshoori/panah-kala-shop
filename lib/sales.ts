import { prisma } from '@/db/prisma';

/**
 * Bump Product.numSales for every line item of a paid order.
 * Called once per payment milestone (ZarinPal verify OK / COD mark-paid).
 * Fire-and-forget at call sites: failures are logged, never block checkout.
 */
export async function bumpProductSales(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { productId: true, qty: true },
  });
  // Same product may appear twice (different variants) — dedupe, sum qty
  const totals = new Map<string, number>();
  for (const it of items) {
    totals.set(it.productId, (totals.get(it.productId) ?? 0) + it.qty);
  }
  await Promise.all(
    [...totals].map(([productId, qty]) =>
      prisma.product.update({
        where: { id: productId },
        data: { numSales: { increment: qty } },
      })
    )
  );
}
