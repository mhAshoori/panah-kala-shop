'use client';

import { useActionState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { askQuestion, answerQuestion } from '@/lib/actions/question.actions';
import { formatDateTime } from '@/lib/utils';
import type { QuestionWithDetails } from '@/lib/actions/question.actions';

const Submit = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();
  return (
    <Button type='submit' size='sm' disabled={pending}>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {label}
    </Button>
  );
};

// Ask form (product question when productId set, else general/FAQ)
export const AskQuestionForm = ({
  productId,
  signedIn,
}: {
  productId?: string;
  signedIn: boolean;
}) => {
  const t = useTranslations('qa');
  const tAuth = useTranslations('auth');
  const [state, formAction] = useActionState(askQuestion, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  if (!signedIn) {
    return (
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Link href='/sign-in' className='link text-primary'>
          {tAuth('signIn')}
        </Link>
        <span>{t('signInToAsk')}</span>
      </div>
    );
  }

  return (
    <form action={formAction} className='space-y-2'>
      {productId && <input type='hidden' name='productId' value={productId} />}
      <Textarea
        name='body'
        rows={3}
        maxLength={500}
        required
        placeholder={t('askPlaceholder')}
        className='text-right' dir='rtl'
      />
      <div>
        <Submit label={t('submitQuestion')} />
      </div>
    </form>
  );
};

// Answer form for one question
export const AnswerQuestionForm = ({
  questionId,
  signedIn,
}: {
  questionId: string;
  signedIn: boolean;
}) => {
  const t = useTranslations('qa');
  const tAuth = useTranslations('auth');
  const [state, formAction] = useActionState(answerQuestion, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.message) {
      if (state.success) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  if (!signedIn) {
    return (
      <p className='text-xs text-muted-foreground'>
        <Link href='/sign-in' className='link text-primary'>
          {tAuth('signIn')}
        </Link>{' '}
        {t('signInToAnswer')}
      </p>
    );
  }

  return (
    <form action={formAction} className='space-y-2'>
      <input type='hidden' name='questionId' value={questionId} />
      <Textarea
        name='body'
        rows={2}
        maxLength={1000}
        required
        placeholder={t('answerPlaceholder')}
        className='text-right' dir='rtl'
      />
      <div>
        <Submit label={t('submitAnswer')} />
      </div>
    </form>
  );
};

// Full Q&A list — shared by product page and FAQ page
const QuestionList = ({
  questions,
  signedIn,
  showProductLink = false,
}: {
  questions: QuestionWithDetails[];
  signedIn: boolean;
  showProductLink?: boolean;
}) => {
  const t = useTranslations('qa');
  const locale = useLocale();

  if (questions.length === 0) {
    return (
      <p className='py-4 text-sm text-muted-foreground'>{t('noQuestions')}</p>
    );
  }

  return (
    <div className='space-y-4'>
      {questions.map((q) => (
        <div key={q.id} className='rounded-xl border bg-card p-4'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-sm font-semibold'>{q.body}</p>
            <span className='text-xs text-muted-foreground'>
              {formatDateTime(q.createdAt, locale as 'fa' | 'en').dateOnly}
            </span>
          </div>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t('askedByYou', { name: q.user.name })}
            {showProductLink && q.product && (
              <>
                {' · '}
                <Link
                  href={`/product/${q.product.slug}`}
                  className='hover:text-primary'
                >
                  {locale === 'fa' ? q.product.nameFa : q.product.name}
                </Link>
              </>
            )}
          </p>

          {/* Answers */}
          <div className='mt-3 space-y-2'>
            {q.answers.length === 0 ? (
              <p className='text-xs text-muted-foreground'>{t('noAnswers')}</p>
            ) : (
              q.answers.map((a) => (
                <div
                  key={a.id}
                  className='rounded-lg bg-muted/60 p-3 text-sm'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className='text-xs font-medium'>
                      {a.user.role === 'admin'
                        ? t('adminReply')
                        : `${t('answeredBy')} ${a.userId === q.userId ? t('you') : a.user.name}`}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {formatDateTime(a.createdAt, locale as 'fa' | 'en').dateOnly}
                    </span>
                  </div>
                  <p className='mt-1'>{a.body}</p>
                  {!a.isApproved && (
                    <p className='mt-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'>
                      {t('pendingTag')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Answer form */}
          <div className='mt-3'>
            <AnswerQuestionForm questionId={q.id} signedIn={signedIn} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionList;
