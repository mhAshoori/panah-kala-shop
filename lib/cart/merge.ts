import type { CartItem } from '@/types';
import type { InputJsonValue } from '@/lib/generated/prisma/internal/prismaNamespace';
import { prisma } from '@/db/prisma';
import { calcPrice } from './pricing';

/**
 * Pure merge: dedupe guest items into existing items by product, clamping
 * quantity to available stock. Injectable stock lookup keeps it testable.
 */
export async function mergeCartItems(
  existingItems: CartItem[],
  guestItems: CartItem[],
  getStock: (productId: string) => Promise<number | null>
): Promise<CartItem[]> {
  const mergedItems = existingItems.map((i) => ({ ...i }));

  for (const item of guestItems) {
    const existingItem = mergedItems.find(
      (cartItem) => cartItem.productId === item.productId
    );
    if (existingItem) {
      const stock = await getStock(item.productId);
      existingItem.qty = Math.min(
        existingItem.qty + item.qty,
        stock ?? existingItem.qty + item.qty
      );
    } else {
      mergedItems.push(item);
    }
  }

  return mergedItems;
}

/**
 * Called on sign-in/sign-up (Auth.js jwt callback): attach the guest cart
 * (sessionCartId cookie) to the user, merging into their existing cart if
 * one exists. Mirrors the reference prostore implementation.
 */
export async function mergeGuestCartOnSignIn(
  userId: string,
  sessionCartId: string | undefined
): Promise<void> {
  if (!sessionCartId) return;

  const guestCart = await prisma.cart.findFirst({ where: { sessionCartId } });
  if (!guestCart) return;

  const existingUserCart = await prisma.cart.findFirst({
    where: { userId },
  });

  if (!existingUserCart) {
    // No previous cart — adopt the guest cart
    await prisma.cart.update({
      where: { id: guestCart.id },
      data: { userId },
    });
    return;
  }

  // Both exist — merge guest items into the user cart, then delete it
  const mergedItems = await mergeCartItems(
    existingUserCart.items as unknown as CartItem[],
    guestCart.items as unknown as CartItem[],
    async (productId) => {
      const product = await prisma.product.findFirst({
        where: { id: productId },
        select: { stock: true },
      });
      return product?.stock ?? null;
    }
  );

  const totals = calcPrice(mergedItems);

  await prisma.cart.update({
    where: { id: existingUserCart.id },
    data: {
      items: mergedItems as unknown as InputJsonValue[],
      ...totals,
      sessionCartId,
    },
  });

  await prisma.cart.delete({ where: { id: guestCart.id } });
}
