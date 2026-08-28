'use server';

import { revalidatePath } from 'next/cache';
import { formatError } from '../utils';
import { withActionMessage } from '../action-messages';
import { insertReviewSchema } from '../validator';
import { prisma } from '@/db/prisma';
import { getValidUserId } from '../auth-helpers';
import type { ActionState, Review } from '@/types';

// Create or update the signed-in user's review for a product
export async function createUpdateReview(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId) {
      throw new Error('Your session has expired — please sign in again');
    }

    const review = insertReviewSchema.parse({
      productId: formData.get('productId') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      rating: Number(formData.get('rating')),
      userId,
    });

    const product = await prisma.product.findFirst({
      where: { id: review.productId },
    });
    if (!product) throw new Error(await withActionMessage('productNotFound'));

    const reviewExists = await prisma.review.findFirst({
      where: { productId: review.productId, userId: review.userId },
    });

    await prisma.$transaction(async (tx) => {
      if (reviewExists) {
        await tx.review.update({
          where: { id: reviewExists.id },
          data: {
            title: review.title,
            description: review.description,
            rating: review.rating,
          },
        });
      } else {
        await tx.review.create({ data: review });
      }

      // Recalculate the product's aggregate rating
      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId },
      });

      const numReviews = await tx.review.count({
        where: { productId: review.productId },
      });

      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: averageRating._avg.rating || 0,
          numReviews,
        },
      });
    });

    revalidatePath(`/product/${product.slug}`);

    return { success: true, message: await withActionMessage('reviewSaved') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get all reviews for a product (latest first)
export async function getReviews(productId: string) {
  const data = await prisma.review.findMany({
    where: { productId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return JSON.parse(JSON.stringify(data)) as Review[];
}

// Get the signed-in user's existing review for a product (if any)
export async function getReviewByUserAndProduct(productId: string) {
  const userId = await getValidUserId();
  if (!userId) return null;

  const data = await prisma.review.findFirst({
    where: { productId, userId },
  });

  return data ? (JSON.parse(JSON.stringify(data)) as Review) : null;
}
