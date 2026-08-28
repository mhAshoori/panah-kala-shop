'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createOrder } from '@/lib/actions/order.actions';
import { useRouter } from '@/i18n/navigation';

const PlaceOrderForm = () => {
  const router = useRouter();
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async () => {
    startTransition(async () => {
      const res = await createOrder();

      if (!res.success) {
        toast.error(res.message);
        if (res.redirectTo) router.push(res.redirectTo);
        return;
      }

      if (res.redirectTo) router.push(res.redirectTo);
    });
  };

  return (
    <Button
      onClick={handleSubmit}
      disabled={isPending}
      className='w-full rounded-full'
    >
      {isPending ? (
        <>
          <Loader className='animate-spin w-4 h-4' />
          {t('common.loading')}
        </>
      ) : (
        t('checkout.placeOrder')
      )}
    </Button>
  );
};

export default PlaceOrderForm;