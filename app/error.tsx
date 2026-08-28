'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

// Segment-level error boundary (localized, RTL-safe)
const LocaleError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  const t = useTranslations('common');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10'>
        <AlertTriangle className='h-8 w-8 text-destructive' />
      </div>
      <div className='space-y-1'>
        <h2 className='h3-bold'>{t('error')}</h2>
        <p className='text-sm text-muted-foreground'>{t('errorHint')}</p>
      </div>
      <Button onClick={reset} variant='outline'>
        <RotateCcw className='h-4 w-4' />
        {t('retry')}
      </Button>
    </div>
  );
};

export default LocaleError;
