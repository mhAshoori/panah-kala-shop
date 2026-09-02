import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import MarketingForm from './marketing-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('marketing') };
}

const AdminMarketingPage = async () => {
  const t = await getTranslations('admin');

  return (
    <div className='space-y-4'>
      <div>
        <h1 className='h2-bold'>{t('marketing')}</h1>
        <p className='text-sm text-muted-foreground'>{t('marketingDesc')}</p>
      </div>
      <MarketingForm />
    </div>
  );
};

export default AdminMarketingPage;
