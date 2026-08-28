import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

// Numbered checkout progress steps (RTL-safe with logical gaps)
const CheckoutSteps = ({ current = 0 }: { current: number }) => {
  const t = useTranslations();

  const steps = [
    t('auth.signIn'),
    t('checkout.shippingAddress'),
    t('checkout.paymentMethod'),
    t('checkout.placeOrder'),
  ];

  return (
    <ol className='mb-10 flex flex-wrap items-center gap-y-3'>
      {steps.map((step, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={step} className='flex items-center gap-2'>
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                isDone && 'border-primary bg-primary text-primary-foreground',
                isCurrent && 'border-primary text-primary',
                !isDone && !isCurrent && 'border-border text-muted-foreground'
              )}
            >
              {isDone ? <Check className='h-4 w-4' /> : index + 1}
            </div>
            <span
              className={cn(
                'text-sm whitespace-nowrap',
                isCurrent ? 'font-semibold' : 'text-muted-foreground'
              )}
            >
              {step}
            </span>
            {index !== steps.length - 1 && (
              <span
                aria-hidden='true'
                className={cn(
                  'mx-3 hidden h-px w-10 sm:block',
                  isDone ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default CheckoutSteps;
