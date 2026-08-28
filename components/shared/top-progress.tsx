'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const MIN_VISIBLE_MS = 650;
const FADE_MS = 350;

/**
 * Global top progress bar. The track is always visible; the animated fill
 * appears on in-page navigations (link clicks, GET form submits, back/forward)
 * and completes when the route (pathname or query) changes.
 */
const TopProgress = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const startedAt = useRef(0);

  // Complete the bar when the route changes (respecting a minimum duration)
  useEffect(() => {
    if (state !== 'running') return;
    const elapsed = Date.now() - startedAt.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = setTimeout(() => setState('done'), wait);
    return () => clearTimeout(timer);
  }, [pathname, searchParams, state]);

  // Fade back to idle after completion
  useEffect(() => {
    if (state === 'done') {
      const timer = setTimeout(() => setState('idle'), FADE_MS);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Start on in-page navigations
  useEffect(() => {
    // Deferred start: history.pushState is invoked by React itself inside
    // insertion effects during navigations, where scheduling updates
    // synchronously is forbidden (useInsertionEffect rule). Breaking out of
    // the current task with setTimeout keeps React happy.
    const start = () => {
      setTimeout(() => {
        setState((prev) => {
          if (prev === 'running') return prev;
          startedAt.current = Date.now();
          return 'running';
        });
      }, 0);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
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

    // Catch programmatic navigations (router.push/prefetch, redirects) —
    // they all go through history.pushState/replaceState.
    const mountedAt = Date.now();
    const history = window.history;
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    history.pushState = (...args: Parameters<typeof origPush>) => {
      start();
      return origPush(...args);
    };
    history.replaceState = (...args: Parameters<typeof origReplace>) => {
      // Ignore hydration noise right after mount
      if (
        Date.now() - mountedAt > 1000 &&
        args[2] &&
        String(args[2]) !== window.location.href
      ) {
        start();
      }
      return origReplace(...args);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('popstate', start);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  return (
    <div
      className='fixed inset-x-0 top-0 z-[100] h-1 bg-transparent'
      role='progressbar'
      aria-label='Loading'
      data-state={state}
    >
      <div
        className={
          'h-full bg-gradient-to-r from-primary via-amber-400 to-primary transition-all duration-300 ease-out ' +
          (state === 'running'
            ? 'w-2/3 opacity-100 shadow-[0_0_10px_var(--primary)]'
            : state === 'done'
              ? 'w-full opacity-100'
              : 'w-0 opacity-0')
        }
      />
    </div>
  );
};

export default TopProgress;
