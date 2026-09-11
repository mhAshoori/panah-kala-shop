import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import StarRating from '@/components/shared/product/star-rating';
import MyReviewActions from '@/components/shared/product/my-review-actions';
import { getMyReviews } from '@/lib/actions/review.actions';
import { auth } from '@/auth';
import { formatDateTime } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('review');
  return { title: t('myReviews') };
}

const MyReviewsPage = async () => {
  const session = await auth();
  if (!session) redirect('/sign-in?callbackUrl=%2Fuser%2Freviews');

  const t = await getTranslations('review');
  const locale = await getLocale();
  const reviews = await getMyReviews();

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{t('myReviews')}</h1>

      {reviews.length === 0 ? (
        <p className='text-sm text-muted-foreground'>{t('empty')}</p>
      ) : (
        <div className='space-y-3'>
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className='space-y-2 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <Link
                    href={`/product/${review.product.slug}`}
                    className='text-sm font-medium hover:text-primary'
                  >
                    {locale === 'fa' ? review.product.nameFa : review.product.name}
                  </Link>
                  <div className='flex items-center gap-2'>
                    <StarRating value={review.rating} />
                    {review.isApproved ? (
                      <Badge variant='secondary'>{t('approvedBadge')}</Badge>
                    ) : (
                      <Badge variant='outline'>{t('pendingBadge')}</Badge>
                    )}
                  </div>
                </div>
                <p className='text-sm font-semibold'>{review.title}</p>
                <p className='text-sm text-muted-foreground'>
                  {review.description}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {formatDateTime(review.createdAt, locale as 'fa' | 'en').dateOnly}
                </p>
                <div className='flex justify-end'>
                  <MyReviewActions review={review} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReviewsPage;
