import { getLocale, getTranslations } from 'next-intl/server';
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
import { formatNumberLocale } from '@/lib/persian';

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
  const locale = await getLocale();

  const [{ reviews, distribution }, userId] = await Promise.all([
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

      <div className='flex flex-wrap items-center gap-x-6 gap-y-3'>
        <div className='flex items-center gap-2'>
          <StarRating value={rating} />
          <span className='text-sm text-muted-foreground'>
            {formatNumberLocale(rating.toFixed(1), locale)} ·{' '}
            {formatNumberLocale(numReviews, locale)} {t('count')}
          </span>
        </div>

        {/* Rating distribution bars (Digikala-style) */}
        {numReviews > 0 && (
          <div className='flex min-w-48 flex-1 flex-col gap-1'>
            {distribution
              .slice()
              .reverse()
              .map(({ star, count }) => (
                <div key={star} className='flex items-center gap-2 text-xs'>
                  <span className='w-8 text-muted-foreground'>
                    {formatNumberLocale(star, locale)} ★
                  </span>
                  <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-muted'>
                    <div
                      className='h-full rounded-full bg-amber-400'
                      style={{
                        width: `${(count / numReviews) * 100}%`,
                      }}
                    />
                  </div>
                  <span className='w-8 text-end text-muted-foreground'>
                    {formatNumberLocale(count, locale)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      <ReviewList reviews={reviews} />
    </section>
  );
};

export default ReviewsSection;
