'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Global top progress bar. Starts on link clicks / form GET submissions and
 * completes when the route (pathname or query) changes.
 */
const TopProgress = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');

  // Complete the bar whenever the route changes
  useEffect(() => {
    if (state === 'running') {
      const timer = setTimeout(() => setState('done'), 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Fade out after completion
  useEffect(() => {
    if (state === 'done') {
      const timer = setTimeout(() => setState('idle'), 400);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Start on in-page navigations
  useEffect(() => {
    const start = () => setState((s) => (s === 'idle' ? 'running' : s));

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const anchor = (e.target as HTMLElement).closest('a');
      if (
        anchor &&
        anchor.href &&
        anchor.origin === window.location.origin &&
        !anchor.hasAttribute('download') &&
        anchor.target !== '_blank'
      ) {
        start();
      }
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if ((form.getAttribute('method') || 'get').toLowerCase() === 'get') {
        start();
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('popstate', start);
    };
  }, []);

  if (state === 'idle') return null;

  return (
    <div
      className='fixed inset-x-0 top-0 z-[100] h-0.5'
      role='progressbar'
      aria-label='Loading'
    >
      <div
        className={cn(
          'h-full bg-primary transition-all duration-300 ease-out',
          state === 'running' ? 'w-2/3 opacity-100' : 'w-full opacity-0'
        )}
      />
    </div>
  );
};

export default TopProgress;
