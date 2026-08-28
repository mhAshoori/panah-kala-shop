'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CaseSensitive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateSiteFont } from '@/lib/actions/settings.actions';
import { cn } from '@/lib/utils';

/**
 * Site-wide typeface switcher (admin only): Shabnam or Vazirmatn.
 * Stored in the DB and applied to every visitor via the root layout.
 */
const SiteFontToggle = ({ current, className }: { current: string; className?: string }) => {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (font: 'shabnam' | 'vazirmatn') => {
    if (font === current) return;
    startTransition(async () => {
      const res = await updateSiteFont(font);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message || tCommon('error'));
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' className={cn('w-full justify-start', className)} disabled={isPending}>
          {isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <CaseSensitive className='h-4 w-4' />
          )}
          {t('font')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem
          disabled={current === 'shabnam'}
          onClick={() => switchTo('shabnam')}
        >
          شبنم (Shabnam)
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={current === 'vazirmatn'}
          onClick={() => switchTo('vazirmatn')}
        >
          وزیرمتن (Vazirmatn)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SiteFontToggle;
