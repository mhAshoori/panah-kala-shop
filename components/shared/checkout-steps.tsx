import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

// Checkout progress steps using the order-timeline visual language:
// full-width flex columns, filled circle for done, pulsing border for
// current, muted outline for future.
const CheckoutSteps = ({ current = 0 }: { current: number }) => {
  const t = useTranslations();

  const steps = [
    t('auth.signIn'),
    t('checkout.shippingAddress'),
    t('checkout.paymentMethod'),
    t('checkout.placeOrder'),
  ];

  return (
    <ol className='mb-10 flex items-stretch text-center'>
      {steps.map((step, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        const isFuture = index > current;
        return (
          <li key={step} className='flex-1 px-1'>
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2',
                isDone && 'border-primary bg-primary text-primary-foreground',
                isCurrent && 'border-primary text-primary animate-pulse',
                isFuture && 'border-muted text-muted-foreground'
              )}
            >
              {isDone ? (
                <Check className='h-4 w-4' />
              ) : (
                <span className='text-xs'>{index + 1}</span>
              )}
            </span>
            <p
              className={cn(
                'mt-1 text-xs font-medium whitespace-nowrap',
                isDone || isCurrent ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step}
            </p>
          </li>
        );
      })}
    </ol>
  );
};

export default CheckoutSteps;
