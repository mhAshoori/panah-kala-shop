import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import AdminSidebar from '@/components/shared/admin/sidebar';
import SiteLanguageToggle from '@/components/shared/admin/site-language-toggle';
import { auth } from '@/auth';
import { APP_NAME } from '@/lib/constants';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: `${t('dashboard')} | ${APP_NAME}` };
}

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  // Route guard: only admins may enter /admin
  const session = await auth();
  if (!session) redirect('/sign-in');
  if (session.user?.role !== 'admin') redirect('/user/orders');

  const t = await getTranslations('admin');

  return (
    <div className='flex min-h-screen flex-col md:flex-row'>
      <aside className='border-b bg-card p-4 md:w-64 md:border-e md:border-b-0'>
        <p className='mb-4 hidden px-3 text-sm font-bold md:block'>
          {t('dashboard')}
        </p>
        <AdminSidebar />
        <div className='mt-4 border-t pt-4'>
          <SiteLanguageToggle />
        </div>
      </aside>
      <main className='flex-1 p-4 md:p-6'>{children}</main>
    </div>
  );
};

export default AdminLayout;
