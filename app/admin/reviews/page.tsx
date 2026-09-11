import { getLocale, getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AdminReviewActions from '@/components/shared/admin/admin-review-actions';
import { getAllReviewsAdmin } from '@/lib/actions/review.actions';
import { formatDateTime } from '@/lib/utils';
import { formatNumberLocale } from '@/lib/persian';

const AdminReviewsPage = async () => {
  const t = await getTranslations('admin');
  const tReview = await getTranslations('review');
  const tOrder = await getTranslations('order');
  const locale = await getLocale();
  const reviews = await getAllReviewsAdmin();

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{t('reviews')}</h1>

      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('product')}</TableHead>
              <TableHead>{t('user')}</TableHead>
              <TableHead>{tReview('rating')}</TableHead>
              <TableHead>{tReview('titleLabel')}</TableHead>
              <TableHead>{tOrder('date')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className='text-end'>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='text-center text-muted-foreground'
                >
                  {t('noReviews')}
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className='max-w-40 truncate'>
                    {locale === 'fa' ? review.product.nameFa : review.product.name}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span>{review.user.name}</span>
                      <span className='text-xs text-muted-foreground'>
                        {review.user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatNumberLocale(review.rating, locale)} ★
                  </TableCell>
                  <TableCell className='max-w-48 truncate'>
                    {review.title}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(review.createdAt, locale as 'fa' | 'en').dateOnly}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-wrap items-center gap-1'>
                      {review.isApproved ? (
                        <Badge variant='secondary'>{t('approved')}</Badge>
                      ) : (
                        <Badge variant='outline'>{t('pending')}</Badge>
                      )}
                      {review.verified && (
                        <Badge variant='outline'>
                          {tReview('verifiedPurchase')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className='text-end'>
                    <AdminReviewActions
                      reviewId={review.id}
                      isApproved={review.isApproved}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminReviewsPage;
