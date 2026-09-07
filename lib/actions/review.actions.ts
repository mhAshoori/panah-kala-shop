'use server';

import { revalidatePath } from 'next/cache';
import { formatError } from '../utils';
import { requireAdmin } from '../auth-guard';
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

    // Verified purchase: the user has any order containing this product
    const verified = await prisma.orderItem.findFirst({
      where: { productId: review.productId, order: { userId, isPaid: true } },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      if (reviewExists) {
        await tx.review.update({
          where: { id: reviewExists.id },
          data: {
            title: review.title,
            description: review.description,
            rating: review.rating,
            verified: !!verified,
          },
        });
      } else {
        await tx.review.create({
          data: { ...review, verified: !!verified },
        });
      }

      // Recalculate the product's aggregate rating (approved reviews only)
      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId, isApproved: true },
      });

      const numReviews = await tx.review.count({
        where: { productId: review.productId, isApproved: true },
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

// Get approved reviews for a product (latest first) + rating distribution
export async function getReviews(productId: string) {
  const data = await prisma.review.findMany({
    where: { productId, isApproved: true },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const counts = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: data.filter((r) => r.rating === star).length,
  }));

  return {
    reviews: JSON.parse(JSON.stringify(data)) as Review[],
    distribution: counts,
  };
}

// The signed-in user's own reviews (for /user/reviews)
export async function getMyReviews() {
  const userId = await getValidUserId();
  if (!userId) return [];

  const data = await prisma.review.findMany({
    where: { userId },
    include: {
      product: { select: { slug: true, name: true, nameFa: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return JSON.parse(JSON.stringify(data)) as (Review & {
    product: { slug: string; name: string; nameFa: string };
  })[];
}

// ---------------------------------------------------------------------------
// Admin moderation
// ---------------------------------------------------------------------------

// All reviews (admin) — newest first, with user + product context
export async function getAllReviewsAdmin() {
  await requireAdmin();

  const data = await prisma.review.findMany({
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { slug: true, name: true, nameFa: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return JSON.parse(JSON.stringify(data)) as {
    id: string;
    rating: number;
    title: string;
    description: string;
    isApproved: boolean;
    verified: boolean;
    createdAt: Date;
    user: { name: string; email: string };
    product: { slug: string; name: string; nameFa: string };
  }[];
}

// Approve / un-approve a review (admin); keeps product aggregates in sync
export async function setReviewApproval(
  reviewId: string,
  isApproved: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdmin();

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review)
      throw new Error(await withActionMessage('reviewNotFound'));

    await prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: { isApproved },
      });

      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId, isApproved: true },
      });
      const numReviews = await tx.review.count({
        where: { productId: review.productId, isApproved: true },
      });

      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: averageRating._avg.rating || 0,
          numReviews,
        },
      });
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// Delete a review (admin)
export async function deleteReviewAdmin(
  reviewId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdmin();

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review)
      throw new Error(await withActionMessage('reviewNotFound'));

    await prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });

      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId, isApproved: true },
      });
      const numReviews = await tx.review.count({
        where: { productId: review.productId, isApproved: true },
      });

      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: averageRating._avg.rating || 0,
          numReviews,
        },
      });
    });

    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
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
