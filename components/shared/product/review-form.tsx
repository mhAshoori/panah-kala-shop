'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { createUpdateReview } from '@/lib/actions/review.actions';
import { cn } from '@/lib/utils';
import { Review } from '@/types';

const SubmitButton = ({ label }: { label: string }) => {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' disabled={pending}>
      {pending && <Loader2 className='h-4 w-4 animate-spin' />}
      {label}
    </Button>
  );
};

// Dialog form to create/update the signed-in user's review
const ReviewForm = ({
  productId,
  existingReview,
}: {
  productId: string;
  existingReview?: Review | null;
}) => {
  const t = useTranslations('review');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hover, setHover] = useState(0);

  const [state, formAction] = useActionState(createUpdateReview, {
    success: false,
    message: '',
  });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      const timer = setTimeout(() => setOpen(false), 0);
      router.refresh();
      return () => clearTimeout(timer);
    } else if (state.message) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline'>
          {existingReview ? t('edit') : t('write')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingReview ? t('edit') : t('write')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className='space-y-4'>
          <input type='hidden' name='productId' value={productId} />
          <input type='hidden' name='rating' value={rating} />

          <FieldGroup>
            <Field>
              <FieldLabel>{t('rating')}</FieldLabel>
              <div className='flex gap-1' dir='ltr'>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    type='button'
                    aria-label={`${i}`}
                    className='focus:outline-none'
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(i)}
                  >
                    <Star
                      className={cn(
                        'h-6 w-6 transition-colors',
                        i <= (hover || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/40'
                      )}
                    />
                  </button>
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor='review-title'>{t('titleLabel')}</FieldLabel>
              <Input
                id='review-title'
                name='title'
                defaultValue={existingReview?.title}
                required
                minLength={3}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='review-description'>
                {t('descriptionLabel')}
              </FieldLabel>
              <Textarea
                id='review-description'
                name='description'
                defaultValue={existingReview?.description}
                className='resize-none'
                rows={4}
                required
                minLength={3}
              />
            </Field>
          </FieldGroup>

          <SubmitButton label={tCommon('save')} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
