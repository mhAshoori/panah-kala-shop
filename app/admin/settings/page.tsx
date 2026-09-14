import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getAiBaseUrl, getAiEnabled, getAiModel } from '@/lib/ai/settings';
import { hasAnyAiCredential } from '@/lib/ai/provider';
import {
  getFreeShippingThreshold,
  getShippingFee,
  getStorePageSize,
  getTaxRate,
} from '@/lib/store-config';
import AiSettingsForm from './ai-settings-form';
import StorePricingForm from './store-pricing-form';

export const metadata: Metadata = { title: 'تنظیمات | پناه کالا' };

const AdminSettingsPage = async () => {
  const t = await getTranslations('admin');
  const [model, baseUrl, enabled, shippingFee, freeThreshold, taxRate, storePageSize] =
    await Promise.all([
      getAiModel(),
      getAiBaseUrl(),
      getAiEnabled(),
      getShippingFee(),
      getFreeShippingThreshold(),
      getTaxRate(),
      getStorePageSize(),
    ]);

  return (
    <div className='space-y-6'>
      <div className='space-y-1'>
        <h1 className='h2-bold'>{t('settingsTitle')}</h1>
      </div>
      <div className='grid items-start gap-6 lg:grid-cols-2'>
        <StorePricingForm
          initialShippingFee={shippingFee}
          initialFreeShippingThreshold={freeThreshold}
          initialTaxRate={taxRate}
          initialStorePageSize={storePageSize}
        />
        <AiSettingsForm
          initialModel={model}
          initialBaseUrl={baseUrl}
          initialEnabled={enabled}
          hasKey={hasAnyAiCredential()}
        />
      </div>
    </div>
  );
};

export default AdminSettingsPage;
