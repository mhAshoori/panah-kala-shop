'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Languages, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateSiteLocale } from '@/lib/actions/settings.actions';
import { cn } from '@/lib/utils';

/**
 * Site-wide language switcher. Rendered in the admin area only: the chosen
 * language applies to every visitor (stored in the DB, Persian default).
 */
const SiteLanguageToggle = ({ className }: { className?: string }) => {
  const locale = useLocale();
  const t = useTranslations('header');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (newLocale: 'fa' | 'en') => {
    if (newLocale === locale) return;
    startTransition(async () => {
      const res = await updateSiteLocale(newLocale);
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
            <Languages className='h-4 w-4' />
          )}
          {t('language')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem
          disabled={locale === 'fa'}
          onClick={() => switchTo('fa')}
        >
          فارسی
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={locale === 'en'}
          onClick={() => switchTo('en')}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SiteLanguageToggle;
