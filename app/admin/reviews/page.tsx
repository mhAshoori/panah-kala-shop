import Link from 'next/link';
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
import QaAdminCard from '@/components/shared/admin/qa-admin-card';
import { getAllReviewsAdmin } from '@/lib/actions/review.actions';
import { getAllQuestionsAdmin } from '@/lib/actions/question.actions';
import { formatDateTime } from '@/lib/utils';
import { formatNumberLocale } from '@/lib/persian';
import { cn } from '@/lib/utils';

const AdminReviewsPage = async (props: {
  searchParams: Promise<{ tab?: string }>;
}) => {
  const { tab } = await props.searchParams;
  const activeTab = tab === 'questions' ? 'questions' : 'reviews';

  const t = await getTranslations('admin');
  const tReview = await getTranslations('review');
  const tOrder = await getTranslations('order');
  const tQa = await getTranslations('qa');
  const locale = await getLocale();
  const reviews = activeTab === 'reviews' ? await getAllReviewsAdmin() : [];
  const questions =
    activeTab === 'questions' ? await getAllQuestionsAdmin() : [];

  const tabLink = (key: 'reviews' | 'questions', label: string) => (
    <Link
      href={`/admin/reviews?tab=${key}`}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        activeTab === key
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{t('reviewsAndQuestions')}</h1>

      <div className='flex gap-2'>
        {tabLink('reviews', t('reviews'))}
        {tabLink('questions', tQa('questionsTitle'))}
      </div>

      {activeTab === 'reviews' ? (
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
      ) : (
        <div className='space-y-3'>
          {questions.length === 0 ? (
            <p className='py-10 text-center text-sm text-muted-foreground'>
              {t('noReviews')}
            </p>
          ) : (
            questions.map((q) => <QaAdminCard key={q.id} question={q} />)
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReviewsPage;
