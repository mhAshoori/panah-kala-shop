import { useTranslations } from 'next-intl';

import StarRating from './star-rating';
import { formatDateTime } from '@/lib/utils';
import { Review } from '@/types';

const ReviewList = ({ reviews }: { reviews: Review[] }) => {
  const t = useTranslations('review');

  if (reviews.length === 0) {
    return <p className='py-4 text-sm text-muted-foreground'>{t('empty')}</p>;
  }

  return (
    <div className='space-y-4'>
      {reviews.map((review) => (
        <div key={review.id} className='rounded-xl border bg-card p-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold'>
                {review.user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className='flex items-center gap-1.5 text-sm font-medium'>
                  {review.user.name}
                  {review.verified && (
                    <span className='rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400'>
                      {t('verifiedPurchase')}
                    </span>
                  )}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {formatDateTime(review.createdAt).dateOnly}
                </p>
              </div>
            </div>
            <StarRating value={review.rating} />
          </div>
          <p className='mt-3 text-sm font-semibold'>{review.title}</p>
          <p className='mt-1 text-sm text-muted-foreground'>{review.description}</p>
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
