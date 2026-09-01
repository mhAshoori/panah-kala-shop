import type { Metadata } from 'next';

import { getAiBaseUrl, getAiEnabled, getAiModel } from '@/lib/ai/settings';
import { hasAnyAiCredential } from '@/lib/ai/provider';
import AiSettingsForm from './ai-settings-form';

export const metadata: Metadata = { title: 'تنظیمات | پناه کالا' };

const AdminSettingsPage = async () => {
  const [model, baseUrl, enabled] = await Promise.all([
    getAiModel(),
    getAiBaseUrl(),
    getAiEnabled(),
  ]);

  return (
    <AiSettingsForm
      initialModel={model}
      initialBaseUrl={baseUrl}
      initialEnabled={enabled}
      hasKey={hasAnyAiCredential()}
    />
  );
};

export default AdminSettingsPage;
