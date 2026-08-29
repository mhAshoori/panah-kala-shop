'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { toggleFavorite } from '@/lib/actions/favorite.actions';
import { cn } from '@/lib/utils';

// Star/un-star a product (sign-in required; guests get redirected to sign-in)
const FavoriteToggle = ({
  productId,
  initialFavorited,
}: {
  productId: string;
  initialFavorited: boolean;
}) => {
  const t = useTranslations('review');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const res = await toggleFavorite(productId);
      if (res.success) {
        setFavorited(!!res.favorited);
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message || tCommon('error'));
      }
    });
  };

  return (
    <Button
      variant='outline'
      size='icon'
      aria-label={favorited ? t('favoriteRemove') : t('favoriteAdd')}
      disabled={isPending}
      onClick={toggle}
    >
      {isPending ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : (
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            favorited ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'
          )}
        />
      )}
    </Button>
  );
};

export default FavoriteToggle;
