import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const CheckoutSteps = ({ current = 0 }: { current: number }) => {
  const t = useTranslations();

  const steps = [
    t('auth.signIn'),
    t('checkout.shippingAddress'),
    t('checkout.paymentMethod'),
    t('checkout.placeOrder'),
  ];

  return (
    <div className='flex-between flex-col md:flex-row space-x-2 space-y-2 mb-10'>
      {steps.map((step, index) => (
        <div key={step} className='flex items-center'>
          <div
            className={cn(
              'p-2 w-full md:w-56 rounded-full text-center text-sm whitespace-nowrap',
              index === current ? 'bg-secondary text-secondary-foreground' : ''
            )}
          >
            {step}
          </div>
          {index !== steps.length - 1 && (
            <hr className='w-16 border-t border-border mx-2' />
          )}
        </div>
      ))}
    </div>
  );
};

export default CheckoutSteps;