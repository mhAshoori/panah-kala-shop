'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Floating "back to top" — appears after a screen of scrolling, bottom-start.
const BackToTop = () => {
  const [show, setShow] = useState(false);
  const t = useTranslations('common');

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <Button
      size='icon'
      aria-label={t('backToTop')}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className='fixed bottom-24 start-6 z-40 rounded-full shadow-lg md:bottom-6'
    >
      <ArrowUp className='h-4 w-4 rtl:-scale-x-100' aria-hidden />
    </Button>
  );
};

export default BackToTop;
