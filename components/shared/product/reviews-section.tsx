import { getTranslations } from 'next-intl/server';

import StarRating from './star-rating';
import ReviewList from './review-list';
import ReviewForm from './review-form';
import { getReviews, getReviewByUserAndProduct } from '@/lib/actions/review.actions';

// Product reviews section: summary, write/edit button and the review list
const ReviewsSection = async ({
  productId,
  rating,
  numReviews,
}: {
  productId: string;
  rating: number;
  numReviews: number;
}) => {
  const t = await getTranslations('review');

  const [reviews, userReview] = await Promise.all([
    getReviews(productId),
    getReviewByUserAndProduct(productId),
  ]);

  return (
    <section className='mt-10 space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='h3-bold'>{t('title')}</h2>
        <ReviewForm productId={productId} existingReview={userReview} />
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
