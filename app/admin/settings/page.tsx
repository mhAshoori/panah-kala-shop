import type { Metadata } from 'next';

import { getAiBaseUrl, getAiEnabled, getAiModel } from '@/lib/ai/settings';
import { hasAnyAiCredential } from '@/lib/ai/provider';
import {
  getFreeShippingThreshold,
  getShippingFee,
  getTaxRate,
} from '@/lib/store-config';
import AiSettingsForm from './ai-settings-form';
import StorePricingForm from './store-pricing-form';

export const metadata: Metadata = { title: 'تنظیمات | پناه کالا' };

const AdminSettingsPage = async () => {
  const [model, baseUrl, enabled, shippingFee, freeThreshold, taxRate] =
    await Promise.all([
      getAiModel(),
      getAiBaseUrl(),
      getAiEnabled(),
      getShippingFee(),
      getFreeShippingThreshold(),
      getTaxRate(),
    ]);

  return (
    <div className='space-y-6'>
      <StorePricingForm
        initialShippingFee={shippingFee}
        initialFreeShippingThreshold={freeThreshold}
        initialTaxRate={taxRate}
      />
      <AiSettingsForm
        initialModel={model}
        initialBaseUrl={baseUrl}
        initialEnabled={enabled}
        hasKey={hasAnyAiCredential()}
      />
    </div>
  );
};

export default AdminSettingsPage;
