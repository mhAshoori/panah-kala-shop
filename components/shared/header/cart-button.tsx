import { ShoppingCart } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getMyCart } from '@/lib/actions/cart.actions';

const CartButton = async () => {
  const [cart, t] = await Promise.all([
    getMyCart(),
    getTranslations('header'),
  ]);

  // Total quantity across all items
  const count =
    cart?.items.reduce((acc, item) => acc + item.qty, 0) ?? 0;

  return (
    <Button asChild variant='ghost'>
      <Link href='/cart'>
        <ShoppingCart />
        <span className='hidden md:inline'>{t('cart')}</span>
        {count > 0 && (
          <Badge className='ms-1 px-2 py-0.5 rounded-full text-xs'>
            {count}
          </Badge>
        )}
      </Link>
    </Button>
  );
};

export default CartButton;