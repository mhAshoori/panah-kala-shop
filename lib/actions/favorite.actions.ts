'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { getValidUserId } from '../auth-helpers';
import { withActionMessage } from '../action-messages';

// Toggle a product star/un-star for the signed-in user
export async function toggleFavorite(productId: string): Promise<{
  success: boolean;
  message: string;
  favorited?: boolean;
}> {
  try {
    const userId = await getValidUserId();
    if (!userId)
      throw new Error(await withActionMessage('sessionExpired'));

    const existing = await prisma.favorite.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      revalidatePath('/user/favorites');
      return { success: true, message: await withActionMessage('favoriteRemoved'), favorited: false };
    }

    // Product must exist
    const product = await prisma.product.findFirst({ where: { id: productId } });
    if (!product)
      throw new Error(await withActionMessage('productNotFound'));

    await prisma.favorite.create({ data: { userId, productId } });
    revalidatePath('/user/favorites');
    return { success: true, message: await withActionMessage('favoriteAdded'), favorited: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// Get the signed-in user's favorited products (for /user/favorites)
export async function getMyFavorites() {
  const userId = await getValidUserId();
  if (!userId) return { ids: [] as string[], products: [] };

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  });

  return {
    ids: favorites.map((f) => f.productId),
    products: JSON.parse(
      JSON.stringify(favorites.map((f) => f.product))
    ),
  };
}

// Whether the current user has favorited a given product (PDP star state)
export async function isProductFavorited(productId: string) {
  const userId = await getValidUserId();
  if (!userId) return false;

  const fav = await prisma.favorite.findFirst({
    where: { userId, productId },
  });
  return !!fav;
}
