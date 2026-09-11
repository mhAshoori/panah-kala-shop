'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Loader2, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import {
  setAnswerApproval,
  deleteQuestionAdmin,
  deleteAnswerAdmin,
  adminAnswerQuestion,
} from '@/lib/actions/question.actions';
import { formatDateTime } from '@/lib/utils';

export type AdminQuestion = {
  id: string;
  body: string;
  createdAt: Date;
  user: { name: string; email: string };
  product?: { slug: string; name: string; nameFa: string } | null;
  answers: {
    id: string;
    body: string;
    isApproved: boolean;
    createdAt: Date;
    user: { name: string; role: string };
  }[];
};

export default function QaAdminCard({
  question,
}: {
  question: AdminQuestion;
}) {
  const t = useTranslations('qa');
  const tAdmin = useTranslations('admin');
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const approve = (answerId: string, isApproved: boolean) => {
    startTransition(async () => {
      const res = await setAnswerApproval(answerId, isApproved);
      if (res.success) toast.success(tAdmin('reviewUpdated'));
      else toast.error(res.message || tAdmin('error'));
    });
  };

  const removeQuestion = () => {
    startTransition(async () => {
      const res = await deleteQuestionAdmin(question.id);
      if (res.success) toast.success(t('questionDeleted'));
      else toast.error(res.message || tAdmin('error'));
    });
  };

  const removeAnswer = (answerId: string) => {
    startTransition(async () => {
      const res = await deleteAnswerAdmin(answerId);
      if (res.success) toast.success(t('answerDeleted'));
      else toast.error(res.message || tAdmin('error'));
    });
  };

  const sendReply = () => {
    if (reply.trim().length < 2) return;
    setSending(true);
    startTransition(async () => {
      const res = await adminAnswerQuestion(question.id, reply.trim());
      setSending(false);
      if (res.success) {
        toast.success(res.message || t('answerSaved'));
        setReply('');
      } else {
        toast.error(res.message || tAdmin('error'));
      }
    });
  };

  return (
    <Card>
      <CardContent className='space-y-3 p-4'>
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <div className='min-w-0'>
            <p className='text-sm font-semibold'>{question.body}</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              {question.user.name} · {question.user.email} ·{' '}
              {formatDateTime(question.createdAt, locale as 'fa' | 'en').dateOnly}
              {' · '}
              {question.product ? (
                <Link
                  href={`/product/${question.product.slug}`}
                  className='hover:text-primary'
                >
                  {locale === 'fa'
                    ? question.product.nameFa
                    : question.product.name}
                </Link>
              ) : (
                t('generalQuestion')
              )}
            </p>
          </div>
          <Button
            size='sm'
            variant='destructive'
            disabled={isPending}
            onClick={removeQuestion}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>

        {/* Existing answers */}
        {question.answers.length > 0 && (
          <div className='space-y-2'>
            {question.answers.map((a) => (
              <div
                key={a.id}
                className='rounded-lg bg-muted/60 p-3 text-sm'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='text-xs font-medium'>
                    {a.user.role === 'admin'
                      ? t('adminReply')
                      : `${t('answeredBy')} ${a.user.name}`}
                    {' · '}
                    {formatDateTime(a.createdAt, locale as 'fa' | 'en').dateOnly}
                  </span>
                  <span className='flex items-center gap-1'>
                    {a.isApproved ? (
                      <Badge variant='secondary'>{tAdmin('approved')}</Badge>
                    ) : (
                      <Badge variant='outline'>{tAdmin('pending')}</Badge>
                    )}
                    <Button
                      size='sm'
                      variant={a.isApproved ? 'outline' : 'default'}
                      disabled={isPending}
                      onClick={() => approve(a.id, !a.isApproved)}
                    >
                      {a.isApproved ? (
                        <X className='h-4 w-4' />
                      ) : (
                        <Check className='h-4 w-4' />
                      )}
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      disabled={isPending}
                      onClick={() => removeAnswer(a.id)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </span>
                </div>
                <p className='mt-1'>{a.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Admin reply box */}
        <div className='flex items-end gap-2'>
          <Textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={1000}
            placeholder={t('answerPlaceholder')}
          />
          <Button size='sm' disabled={sending || isPending} onClick={sendReply}>
            {sending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Send className='h-4 w-4 rtl:-scale-x-100' />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
