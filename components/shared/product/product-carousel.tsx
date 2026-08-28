'use client';

import {
  Children,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Horizontal product carousel with arrow controls and dot pagination.
 * Product cards are rendered on the server and passed as children.
 */
const ProductCarousel = ({
  children,
  title,
  action,
}: {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}) => {
  const locale = useLocale();
  const isFa = locale === 'fa';
  const trackRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const [active, setActive] = useState(0);

  const getPosition = (el: HTMLElement) =>
    Math.abs(el.scrollLeft); // RTL scrollLeft is negative

  const measure = () => {
    const el = trackRef.current;
    if (!el) return;
    const max = getPosition(el);
    const total = Math.max(1, Math.ceil(max / Math.max(el.clientWidth, 1)) + 1);
    setPages(total);
    setActive(
      Math.min(total - 1, Math.round(max / Math.max(el.clientWidth, 1)))
    );
  };

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  const scrollToPage = (page: number) => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const target = Math.min(page, pages - 1) * el.clientWidth;
    el.scrollTo({ left: isFa ? -Math.min(target, max) : Math.min(target, max), behavior: 'smooth' });
  };

  const step = (dir: 1 | -1) => scrollToPage(active + dir);

  const showControls = pages > 1;

  return (
    <section className='space-y-4'>
      <div className='flex-between gap-2'>
        <h2 className='h2-bold'>{title}</h2>
        <div className='flex items-center gap-2'>
          {action}
          {showControls && (
            <div className='hidden sm:flex gap-1'>
              <Button
                variant='outline'
                size='icon'
                aria-label='previous'
                onClick={() => step(isFa ? 1 : -1)}
              >
                <ChevronRight className='h-4 w-4 rtl:rotate-180' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                aria-label='next'
                onClick={() => step(isFa ? -1 : 1)}
              >
                <ChevronLeft className='h-4 w-4 rtl:rotate-180' />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className='flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]'
      >
        {Children.map(children, (child) => (
          <div className='w-64 shrink-0 snap-start sm:w-72'>{child}</div>
        ))}
      </div>

      {/* Dot pagination */}
      {showControls && (
        <div className='flex justify-center gap-1.5'>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type='button'
              aria-label={`page ${i + 1}`}
              onClick={() => scrollToPage(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === active
                  ? 'w-6 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductCarousel;
