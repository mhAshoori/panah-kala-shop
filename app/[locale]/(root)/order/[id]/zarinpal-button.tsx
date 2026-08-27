'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createZarinpalPayment } from '@/lib/actions/payment.actions';

const ZarinpalButton = ({ orderId }: { orderId: string }) => {
  const [isPending, setPending] = useState(false);
  const t = useTranslations('order');

  const handlePay = async () => {
    setPending(true);
    const res = await createZarinpalPayment(orderId);
    setPending(false);

    if (!res.success) {
      toast.error(res.message);
      return;
    }

    const startUrl = (res as { startUrl?: string }).startUrl;
    if (!startUrl) {
      toast.error(t('paymentFailed'));
      return;
    }

    // Redirect the browser to the ZarinPal gateway StartPay page
    window.location.href = startUrl;
  };

  return (
    <Button onClick={handlePay} disabled={isPending} className='w-full rounded-full'>
      {isPending ? (
        <>
          <Loader className='animate-spin w-4 h-4' /> {t('checkoutTitle')}
        </>
      ) : (
        t('payNow')
      )}
    </Button>
  );
};

export default ZarinpalButton;