import { getTranslations } from 'next-intl/server';
import { LogIn } from 'lucide-react';

import StarRating from './star-rating';
import ReviewList from './review-list';
import ReviewForm from './review-form';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  getReviews,
  getReviewByUserAndProduct,
} from '@/lib/actions/review.actions';
import { getValidUserId } from '@/lib/auth-helpers';

// Product reviews section: summary, write/edit button and the review list
const ReviewsSection = async ({
  productId,
  rating,
  numReviews,
  slug,
}: {
  productId: string;
  rating: number;
  numReviews: number;
  slug: string;
}) => {
  const t = await getTranslations('review');

  const [reviews, userId] = await Promise.all([
    getReviews(productId),
    getValidUserId(),
  ]);

  const userReview = userId
    ? await getReviewByUserAndProduct(productId)
    : null;

  return (
    <section className='mt-10 space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='h3-bold'>{t('title')}</h2>
        {userId ? (
          <ReviewForm productId={productId} existingReview={userReview} />
        ) : (
          // Guests (or stale sessions) get a sign-in prompt instead of an error
          <Button asChild variant='outline'>
            <Link href={`/sign-in?callbackUrl=${encodeURIComponent(`/product/${slug}`)}`}>
              <LogIn className='h-4 w-4' />
              {t('signInToReview')}
            </Link>
          </Button>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <StarRating value={rating} />
        <span className='text-sm text-muted-foreground'>
          {rating.toFixed(1)} · {numReviews} {t('count')}
        </span>
      </div>

      <ReviewList reviews={reviews} />
    </section>
  );
};

export default ReviewsSection;
