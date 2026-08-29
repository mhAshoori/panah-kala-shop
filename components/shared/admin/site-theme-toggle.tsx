'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateSiteTheme } from '@/lib/actions/settings.actions';
import { cn } from '@/lib/utils';

/**
 * Site-wide default color theme (admin only): system, light or dark.
 * Stored in the DB; individual visitors can still override via the header.
 */
const SiteThemeToggle = ({
  current,
  className,
}: {
  current: string;
  className?: string;
}) => {
  const tHeader = useTranslations('header');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchTo = (theme: 'system' | 'light' | 'dark') => {
    if (theme === current) return;
    startTransition(async () => {
      const res = await updateSiteTheme(theme);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const options = [
    { value: 'system', label: tHeader('themeSystem') },
    { value: 'light', label: tHeader('themeLight') },
    { value: 'dark', label: tHeader('themeDark') },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          className={cn('w-full justify-start', className)}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Palette className='h-4 w-4' />
          )}
          {tHeader('theme')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            disabled={current === o.value}
            onClick={() => switchTo(o.value as 'system' | 'light' | 'dark')}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SiteThemeToggle;
