import { ShoppingCart } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getMyCart } from '@/lib/actions/cart.actions';
import { formatNumberLocale } from '@/lib/persian';

const CartButton = async () => {
  const [cart, t, locale] = await Promise.all([
    getMyCart(),
    getTranslations('header'),
    getLocale(),
  ]);

  // Total quantity across all items (Persian digits in fa)
  const count =
    cart?.items.reduce((acc, item) => acc + item.qty, 0) ?? 0;

  return (
    <Button asChild variant='ghost'>
      <Link href='/cart'>
        <ShoppingCart />
        <span className='hidden md:inline'>{t('cart')}</span>
        {count > 0 && (
          <Badge className='ms-1 px-2 py-0.5 rounded-full text-xs tabular-nums'>
            {formatNumberLocale(count, locale)}
          </Badge>
        )}
      </Link>
    </Button>
  );
};

export default CartButton;
