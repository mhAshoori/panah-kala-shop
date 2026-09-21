// Shared stock-alert recording: called whenever a product's stock drops to
// LOW_STOCK_THRESHOLD or below. One insert per event, never throws.
import { prisma } from '@/db/prisma';
import { LOW_STOCK_THRESHOLD } from './constants';
import { recordNotification } from './notifications';
import { stockEventWording } from './notification-events';

export async function recordStockEventIfLow(
  product: { id: string; name: string; stock: number } | null | undefined
): Promise<void> {
  if (!product) return;
  const stock = Number(product.stock);
  if (stock > LOW_STOCK_THRESHOLD) return;
  try {
    const existing = await prisma.notification.findFirst({
      where: {
        type: 'stock',
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        data: { path: ['productId'], equals: product.id },
      },
      select: { id: true },
    });
    if (existing) return; // dedupe: one stock toast per product per hour

    recordNotification({
      type: 'stock',
      title: 'موجودی کالا',
      body: `${product.name} — ${stockEventWording(stock)}`,
      data: { productId: product.id, productName: product.name, stock },
    });
  } catch {
    // logging handled inside recordNotification / dedupe is best-effort
  }
}
