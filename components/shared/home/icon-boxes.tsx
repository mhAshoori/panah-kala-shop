import { getTranslations } from 'next-intl/server';
import { Headset, ShieldCheck, Truck, Undo2 } from 'lucide-react';

// Feature highlights row on the homepage
const IconBoxes = async () => {
  const t = await getTranslations('home');

  const items = [
    { icon: Truck, title: t('freeShipping'), desc: t('freeShippingDesc') },
    { icon: ShieldCheck, title: t('securePayment'), desc: t('securePaymentDesc') },
    { icon: Headset, title: t('support'), desc: t('supportDesc') },
    { icon: Undo2, title: t('moneyBack'), desc: t('moneyBackDesc') },
  ];

  return (
    <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {items.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className='flex items-start gap-3 rounded-xl border bg-card p-4'
        >
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Icon className='h-5 w-5' aria-hidden='true' />
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-semibold'>{title}</p>
            <p className='mt-0.5 text-xs text-muted-foreground'>{desc}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

export default IconBoxes;
