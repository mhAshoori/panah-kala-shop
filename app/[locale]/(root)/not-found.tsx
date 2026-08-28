'use client';

import { useTranslations } from 'next-intl';
import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

const NotFound = () => {
  const t = useTranslations('common');
  const th = useTranslations('home');

  return (
    <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center'>
      <div className='flex h-16 w-16 items-center justify-center rounded-full bg-muted'>
        <SearchX className='h-8 w-8 text-muted-foreground' />
      </div>
      <h1 className='h2-bold'>404</h1>
      <p className='text-muted-foreground'>{t('notFound')}</p>
      <Button asChild>
        <Link href='/'>{th('shopNow')}</Link>
      </Button>
    </div>
  );
};

export default NotFound;
