import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import AdminSupportClient from './admin-support-client';
import { getAdminSupportThreads } from '@/lib/actions/support.actions';

export const metadata: Metadata = { title: 'پشتیبانی | پناه کالا' };

const AdminSupportPage = async () => {
  const t = await getTranslations('admin');
  const threads = await getAdminSupportThreads({ page: 1, limit: 50 });

  return (
    <div className='space-y-6'>
      <h1 className='h2-bold'>{t('supportTitle')}</h1>
      <AdminSupportClient initialThreads={threads} />
    </div>
  );
};

export default AdminSupportPage;
